"""K-Startup 지원사업 공고 수집 — data-model.md §1(API 확정 사실)·§2(매핑)·§6(정규화 규칙).

수집 범위: 전량, returnType=json (ingest.md 규칙 1).
"""
import logging
import time
from collections.abc import Callable, Iterator

import requests

from ingest import db
from ingest.config import Settings
from ingest.errors import SourceError
from ingest.sources.http_client import request_json
from ingest.normalize import (
    clean_text,
    clean_url,
    normalize_audiences,
    normalize_category,
    normalize_organization_type,
    normalize_region,
    normalize_stages,
    parse_yyyymmdd,
)
from ingest.record import MappingResult, OpportunityRecord
from ingest.report import SourceReport

logger = logging.getLogger(__name__)

SOURCE = "k-startup"
BASE_URL = (
    "https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01"
)
PER_PAGE = 100

# apply_url 폴백 체인 (§6 규칙 12). clean_url이 "URL일 때" 판정을 겸한다(비URL 텍스트 → None)
_APPLY_URL_FIELDS = ("biz_aply_url", "aply_mthd_onli_rcpt_istc", "biz_gdnc_url")


def collect(settings: Settings, conn) -> SourceReport:
    """전 페이지 수집 → 매핑 → 페이지 단위 UPSERT. 레코드 오류는 스킵, 페이지 단위 커밋."""
    if not settings.kstartup_api_key:
        raise SourceError("KSTARTUP_API_KEY 미설정 — apps/ingest/.env 확인 (.env.example 참조)")
    report = SourceReport(source=SOURCE)
    for items in fetch_pages(settings.kstartup_api_key):
        records = _map_page(items, report)
        new, updated = db.upsert_records(conn, records)
        conn.commit()
        report.fetched += len(items)
        report.new += new
        report.updated += updated
    return report


def _map_page(items: list[dict], report: SourceReport) -> list[OpportunityRecord]:
    records = []
    for raw in items:
        result = map_record(raw)
        report.unknown_values.extend(result.unknown_values)
        if result.record is None:
            report.skipped += 1
            logger.warning("[%s] 레코드 스킵: %s", SOURCE, result.skip_reason)
            continue
        records.append(result.record)
    return records


def fetch_pages(
    api_key: str,
    http_get: Callable = requests.get,
    per_page: int = PER_PAGE,
    sleep: Callable[[float], None] = time.sleep,
) -> Iterator[list[dict]]:
    """totalCount 기반 전 페이지 순회 (§1: perPage=100 → 약 290페이지)."""
    page = 1
    while True:
        payload = _fetch_page(api_key, page, per_page, http_get, sleep)
        items = payload.get("data") or []
        yield items
        total_count = int(payload.get("totalCount") or 0)
        if not items or page * per_page >= total_count:
            return
        page += 1


def _fetch_page(api_key, page, per_page, http_get, sleep) -> dict:
    """재시도·timeout은 공통 클라이언트 담당. 소진 시 SourceError → 소스 단위 격리."""
    params = {
        "serviceKey": api_key,  # data.go.kr 표준 파라미터 (디코딩된 키 사용)
        "returnType": "json",
        "page": page,
        "perPage": per_page,
    }
    return request_json(http_get, BASE_URL, params, sleep=sleep, context=f"[{SOURCE}] page={page}")


def map_record(raw: dict) -> MappingResult:
    """K-Startup 원본 1건 → opportunity 매핑 (§2 표 + §6 규칙 1~15)."""
    unknown: list[str] = []
    external_id = raw.get("pbanc_sn")  # 응답의 id는 행 번호 — 사용 금지 (§6 규칙 14)
    title = clean_text(raw.get("biz_pbanc_nm"))
    if external_id is None or title is None:
        return MappingResult(None, "필수필드 누락(pbanc_sn/biz_pbanc_nm)", unknown)  # §6 규칙 15
    detail_url = clean_url(raw.get("detl_pg_url"))
    if detail_url is None:
        # 스키마 NOT NULL 제약 — 라이브에선 항상 존재, 방어적 스킵
        return MappingResult(None, f"detail_url 없음(pbanc_sn={external_id})", unknown)
    record = OpportunityRecord(
        source=SOURCE,
        external_id=str(external_id),  # JSON에서 number로 옴 → 문자열화 (§6 규칙 3)
        title=title,
        summary=clean_text(raw.get("pbanc_ctnt")),
        category=normalize_category(raw.get("supt_biz_clsfc"), unknown),
        region=normalize_region(raw.get("supt_regin"), unknown),
        organization=clean_text(raw.get("pbanc_ntrp_nm")),
        organization_type=normalize_organization_type(raw.get("sprv_inst"), unknown),
        support_amount=None,  # 공고 API에 없음 — 타 출처/Phase 2에서 보강 (§2)
        target_startup_stage=None,  # 분류 칸은 enrichment(persona)가 raw에서 산출 — 수집은 안 건드림 (#11)
        target_audience_type=None,
        eligibility_detail=clean_text(raw.get("aply_trgt_ctnt")),
        application_start_date=parse_yyyymmdd(raw.get("pbanc_rcpt_bgng_dt")),
        application_deadline=parse_yyyymmdd(raw.get("pbanc_rcpt_end_dt")),
        is_always_open=False,  # K-Startup엔 상시 신호 없음 — 스키마 기본값 유지 (§2)
        detail_url=detail_url,
        apply_url=_resolve_apply_url(raw),
        source_status=clean_text(raw.get("rcrt_prgs_yn")),
        raw=raw,  # 원본 그대로 보존 — 가공 저장 금지 (CLAUDE.md 절대 규칙 3)
    )
    return MappingResult(record, None, unknown)


def direct_targets(raw: dict, unknown: list[str]) -> tuple[list[str] | None, list[str] | None]:
    """구조화 직접 신호(최고 신뢰, §6-D) — biz_enyy/aply_trgt에서 (stage, audience) 산출.

    매 배치 raw에서 재산출한다 → 공고 수정·매핑 보강이 반영되면서도 수집은 분류 칸을 안 건드린다.
    미지 토큰은 unknown에 로그한다 (AC-005 — 새 enum 값 추적).
    """
    return normalize_stages(raw.get("biz_enyy"), unknown), normalize_audiences(raw.get("aply_trgt"), unknown)


def _resolve_apply_url(raw: dict) -> str | None:
    for field_name in _APPLY_URL_FIELDS:
        url = clean_url(raw.get(field_name))
        if url:
            return url
    return None

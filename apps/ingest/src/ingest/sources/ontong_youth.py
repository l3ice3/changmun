"""온통청년 청년정책 수집 — data-model.md §6-C (실데이터 확정 명세).

수집 범위: mclsfNm=창업 슬라이스만, JSON (ingest.md 규칙 1).
라이브 검증(2026-06-12, 322건): mclsfNm 서버 필터 동작, 봉투 = result.pagging/result.youthPolicyList.
기간은 aplyPrdSeCd 코드 단독이 부정확해 폴백 체인으로 판정한다(_resolve_period 참조).
"""
import logging
import time
from collections.abc import Callable, Iterator
from datetime import date

import requests

from ingest import db
from ingest.config import Settings
from ingest.errors import SourceError
from ingest.normalize import (
    clean_text,
    clean_url,
    mentions_always_open,
    normalize_ontong_category,
    parse_yyyymmdd,
    sido_from_zip_codes,
    split_date_range,
)
from ingest.record import MappingResult, OpportunityRecord
from ingest.report import SourceReport
from ingest.sources.http_client import request_json

logger = logging.getLogger(__name__)

SOURCE = "ontong-youth"
BASE_URL = "https://www.youthcenter.go.kr/go/ythip/getPlcy"
# 응답에 상세 URL이 없어 plcyNo로 생성 (§6-C 규칙 4). 패턴 출처: youthcenter 홈페이지 스크립트(라이브 200 확인)
DETAIL_URL_TEMPLATE = "https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch/ythPlcyDetail/{plcyNo}"
CATEGORY_SLICE = "창업"
PER_PAGE = 100

# YOUTH 유추(보수적): 연령 제한이 명시되고 상한이 청년 범위(≤39)일 때만 (§6-C 규칙 1 + AC-009)
YOUTH_MAX_AGE = 39


def collect(settings: Settings, conn) -> SourceReport:
    if not settings.ontong_api_key:
        raise SourceError("ONTONG_API_KEY 미설정 — apps/ingest/.env 확인 (.env.example 참조)")
    report = SourceReport(source=SOURCE)
    for items in fetch_pages(settings.ontong_api_key):
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
    page = 1
    while True:
        result = _fetch_page(api_key, page, per_page, http_get, sleep)
        items = result.get("youthPolicyList") or []
        yield items
        total_count = int((result.get("pagging") or {}).get("totCount") or 0)
        if not items or page * per_page >= total_count:
            return
        page += 1


def _fetch_page(api_key, page, per_page, http_get, sleep) -> dict:
    params = {
        "apiKeyNm": api_key,
        "rtnType": "json",
        "pageNum": page,
        "pageSize": per_page,
        "mclsfNm": CATEGORY_SLICE,
    }
    body = request_json(http_get, BASE_URL, params, sleep=sleep, context=f"[{SOURCE}] page={page}")
    result = body.get("result")
    if result is None:
        raise SourceError(f"[{SOURCE}] page={page} 응답 봉투에 result 없음: {str(body)[:200]}")
    return result


def map_record(raw: dict) -> MappingResult:
    """온통청년 원본 1건 → opportunity 매핑 (§6-C 표 + 전용 규칙 1~5)."""
    unknown: list[str] = []
    external_id = clean_text(raw.get("plcyNo"))
    title = clean_text(raw.get("plcyNm"))
    if external_id is None or title is None:
        return MappingResult(None, "필수필드 누락(plcyNo/plcyNm)", unknown)
    if clean_text(raw.get("mclsfNm")) != CATEGORY_SLICE:
        # 서버 필터 이중 방어 — 수집 범위 밖 슬라이스는 적재하지 않는다
        return MappingResult(None, f"창업 슬라이스 아님(mclsfNm={raw.get('mclsfNm')})", unknown)
    start_date, deadline, always_open = _resolve_period(raw)
    record = OpportunityRecord(
        source=SOURCE,
        external_id=external_id,
        title=title,
        summary=_joined_text(raw.get("plcyExplnCn"), raw.get("plcySprtCn")),
        category=normalize_ontong_category(raw.get("mclsfNm"), title, unknown),
        region=sido_from_zip_codes(raw.get("zipCd"), unknown),
        organization=_organization_of(raw),
        organization_type=None,  # 온통청년엔 기관 유형 필드 없음 (§6-C)
        support_amount=None,
        target_startup_stage=None,  # 업력 신호 없음 → NULL (억지 채움 금지)
        target_audience_type=_derived_audiences(raw),
        eligibility_detail=_resolve_eligibility(raw),
        application_start_date=start_date,
        application_deadline=deadline,
        is_always_open=always_open,
        detail_url=DETAIL_URL_TEMPLATE.format(plcyNo=external_id),
        apply_url=_resolve_apply_url(raw),
        source_status=clean_text(raw.get("aplyPrdSeCd")),
        raw=raw,  # 연령·소득·요건코드 등 원본 그대로 보존 (§6-C 규칙 5)
    )
    return MappingResult(record, None, unknown)


def _joined_text(*values) -> str | None:
    parts = []
    for value in values:
        cleaned = clean_text(value)
        if cleaned:
            parts.append(cleaned)
    return "\n\n".join(parts) or None


def _organization_of(raw: dict) -> str | None:
    organization = clean_text(raw.get("sprvsnInstCdNm"))
    if organization:
        return organization
    return clean_text(raw.get("operInstCdNm"))


def _resolve_eligibility(raw: dict) -> str | None:
    """자격 텍스트 우선, 없으면 지원내용으로 폴백 (§6-C: eligibility_detail = addAplyQlfcCndCn(+plcySprtCn)).

    라이브 322건 중 222건이 addAplyQlfcCndCn 빈값 → 폴백 없으면 카드/상세 자격 영역이 통째로 빈다.
    """
    qualification = clean_text(raw.get("addAplyQlfcCndCn"))
    if qualification:
        return qualification
    return clean_text(raw.get("plcySprtCn"))


def _resolve_period(raw: dict) -> tuple[date | None, date | None, bool]:
    """신청 기간 결정 폴백 체인 (data-model §6-C 보강 — 라이브 분포 검증).

    1. aplyYmd 신청기간 있음        → 그대로 (가장 신뢰)
    2. bizPrdEtcCn에 상시 키워드     → is_always_open (연중·계속·상시·연례·반복…)
    3. bizPrdEndYmd(사업종료일) 유효 → 마감일로 (과거면 status 산식이 CLOSED로 계산 — 저장 안 함)
    4. 그 외(미정·협약기반·빈값)     → 기간 미상 (NULL)
    """
    start_date, deadline = split_date_range(raw.get("aplyYmd"))
    if deadline is not None:
        return start_date, deadline, False
    if mentions_always_open(clean_text(raw.get("bizPrdEtcCn"))):
        return None, None, True
    business_end = parse_yyyymmdd(raw.get("bizPrdEndYmd"))
    if business_end is not None:
        return None, business_end, False
    return start_date, None, False


def _derived_audiences(raw: dict) -> list[str] | None:
    """연령 제한 명시 + 상한 ≤ 39일 때만 YOUTH 유추 — 확실한 신호만 (AC-009).

    schoolCd 기반 UNIV_STUDENT 유추(§6-C 규칙 1)는 코드표 미확보로 보류 — raw 보존, 코드표 확보 후 소급.
    """
    if clean_text(raw.get("sprtTrgtAgeLmtYn")) != "Y":
        return None
    max_age = _parse_age(raw.get("sprtTrgtMaxAge"))
    if max_age is None or max_age == 0 or max_age > YOUTH_MAX_AGE:
        return None
    return ["YOUTH"]


def _parse_age(value) -> int | None:
    text = clean_text(value)
    if text is None or not text.isdigit():
        return None
    return int(text)


def _resolve_apply_url(raw: dict) -> str | None:
    for field_name in ("aplyUrlAddr", "refUrlAddr1"):
        url = clean_url(raw.get(field_name))
        if url:
            return url
    return None

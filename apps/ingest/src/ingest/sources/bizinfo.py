"""기업마당 창업 분야 수집 — data-model.md §6-B."""
import logging
import re
import time
import xml.etree.ElementTree as ElementTree
from collections.abc import Callable, Iterator
from html.parser import HTMLParser

import requests

from ingest import db
from ingest.config import Settings
from ingest.errors import SourceError
from ingest.normalize import clean_text, clean_url, normalize_regions, split_date_range
from ingest.record import MappingResult, OpportunityRecord
from ingest.report import SourceReport
from ingest.sources.http_client import MAX_RETRIES, TIMEOUT_SECONDS, _redact_secrets

logger = logging.getLogger(__name__)

SOURCE = "bizinfo"
BASE_URL = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do"
CATEGORY_CODE = "06"
PER_PAGE = 100

_CATEGORY_MAP = {
    "금융": "융자ㆍ보증",
    "기술": "기술개발(R&D)",
    "인력": "인력",
    "수출": "판로ㆍ해외진출",
    "내수": "판로ㆍ해외진출",
    "창업": "사업화",
    "경영": "기타",
    "기타": "기타",
}


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def collect(settings: Settings, conn) -> SourceReport:
    if not settings.bizinfo_api_key:
        raise SourceError("BIZINFO_API_KEY 미설정 — apps/ingest/.env 확인 (.env.example 참조)")
    report = SourceReport(source=SOURCE)
    for items in fetch_pages(settings.bizinfo_api_key):
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
        items, total_count = _fetch_page(api_key, page, per_page, http_get, sleep)
        yield items
        if not items or page * per_page >= total_count:
            return
        page += 1


def _fetch_page(api_key, page, per_page, http_get, sleep) -> tuple[list[dict], int]:
    params = {
        "crtfcKey": api_key,
        "dataType": "rss",
        "searchLclasId": CATEGORY_CODE,
        "pageUnit": per_page,
        "pageIndex": page,
    }
    last_error = "원인 미상"
    for attempt in range(MAX_RETRIES):
        if attempt > 0:
            sleep(2**attempt)
        try:
            response = http_get(BASE_URL, params=params, timeout=TIMEOUT_SECONDS)
        except requests.RequestException as exc:
            last_error = _redact_secrets(f"요청 실패: {exc}", params)
            continue
        if response.status_code != 200:
            last_error = _redact_secrets(f"HTTP {response.status_code}: {response.text[:200]}", params)
            continue
        try:
            return _parse_page(response.text)
        except (ElementTree.ParseError, ValueError) as exc:
            last_error = _redact_secrets(f"XML 파싱 실패: {exc}", params)
    raise SourceError(f"[{SOURCE}] page={page} 수집 실패 ({MAX_RETRIES}회 재시도): {last_error}")


def _parse_page(xml_text: str) -> tuple[list[dict], int]:
    root = ElementTree.fromstring(xml_text)
    items = [_element_to_dict(item) for item in root.findall(".//item")]
    total_text = _first_text(root, "totCnt", "totalCount")
    if not items and total_text is None:
        # 인증 오류·쿼터 초과는 HTTP 200 + XML 오류 봉투(item·totCnt 없음)로 온다.
        # ([], 0)으로 넘기면 collect()가 성공 리포트를 내 AC-004(무효 키 → 소스 실패)가 깨진다.
        raise ValueError(f"item·totCnt 없는 응답(오류 봉투 의심): {xml_text[:200]}")
    total_count = int(total_text) if total_text and total_text.isdigit() else len(items)
    return items, total_count


def _element_to_dict(element: ElementTree.Element) -> dict:
    return {child.tag.rsplit("}", 1)[-1]: child.text or "" for child in element}


def _first_text(root: ElementTree.Element, *names: str) -> str | None:
    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1] in names and element.text:
            return element.text.strip()
    return None


def map_record(raw: dict) -> MappingResult:
    unknown: list[str] = []
    external_id = _field(raw, "pblancId", "seq")
    title = _field(raw, "pblancNm", "title")
    if external_id is None or title is None:
        return MappingResult(None, "필수필드 누락(pblancId/pblancNm)", unknown)
    category = _category(raw, unknown)
    if category is None:
        return MappingResult(None, "창업 슬라이스 아님(lcategory)", unknown)
    # 확장 필드가 빠지고 RSS 기본 필드 reqstDt만 오는 공고 대비 폴백 (둘 다 "시작 ~ 종료" 형식)
    start_date, deadline = split_date_range(_field(raw, "reqstBeginEndDe", "reqstDt"))
    record = OpportunityRecord(
        source=SOURCE,
        external_id=external_id,
        title=title,
        summary=_strip_html(_field(raw, "bsnsSumryCn", "description")),
        category=category,
        region=_regions(raw, unknown),
        organization=_field(raw, "jrsdInsttNm", "excInsttNm"),
        organization_type=None,
        support_amount=None,
        target_startup_stage=None,
        target_audience_type=None,
        eligibility_detail=_field(raw, "trgetNm"),
        application_start_date=start_date,
        application_deadline=deadline,
        is_always_open=False,
        detail_url=clean_url(_field(raw, "pblancUrl", "link")) or "https://www.bizinfo.go.kr",
        apply_url=clean_url(_field(raw, "rceptEngnHmpgUrl")),
        source_status=None,
        raw=raw,
    )
    return MappingResult(record, None, unknown)


def direct_targets(raw: dict, unknown: list[str]) -> tuple[None, None]:
    return None, None


def _field(raw: dict, *names: str) -> str | None:
    for name in names:
        value = clean_text(raw.get(name))
        if value:
            return value
    return None


def _category(raw: dict, unknown: list[str]) -> str | None:
    value = _field(raw, "pldirSportRealmLclasCodeNm", "lcategory")
    if value is None:
        unknown.append("category:missing")
        return "기타"
    mapped = _CATEGORY_MAP.get(value)
    if mapped is None:
        unknown.append(f"category:{value}")
        return "기타"
    if value != "창업":
        return None
    return mapped


def _regions(raw: dict, unknown: list[str]) -> list[str] | None:
    # 명세(§6-B)는 hashTags지만 라이브 RSS 키는 소문자 hashtags — 양쪽 조회
    hashtags = _field(raw, "hashtags", "hashTags")
    if hashtags is None:
        return None
    tokens = [token.strip().lstrip("#") for token in hashtags.replace(",", " ").split()]
    known = [token for token in tokens if normalize_regions(token, [])]
    return normalize_regions(",".join(known), unknown)


def _strip_html(value: str | None) -> str | None:
    if value is None:
        return None
    parser = _TextExtractor()
    parser.feed(value)
    return clean_text(re.sub(r"\s+", " ", " ".join(parser.parts)))

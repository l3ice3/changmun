"""페르소나 부여 3단계 — 직접(수집 시) → 상속(dedup 그룹) → 키워드 규칙 → NULL.

규칙: data-model.md §6-D. 신호 없으면 NULL 유지(억지 채움 금지, AC-009). LLM 호출 금지(MVP).
키워드 규칙은 보수적으로 — 확실한 패턴만 (ingest.md 규칙 6).
"""
import re

from ingest import db
from ingest.report import EnrichmentReport

_PRE_STARTUP = re.compile(r"예비\s*창업")
_UNIV_STUDENT = re.compile(r"대학생")
_YEARS_UNDER = re.compile(r"(\d{1,2})\s*년\s*미만")

_STAGE_BY_YEARS = {"1": "LT_1Y", "2": "LT_2Y", "3": "LT_3Y", "5": "LT_5Y", "7": "LT_7Y", "10": "LT_10Y"}


def apply(conn) -> EnrichmentReport:
    inherited = db.inherit_group_targets(conn)
    keyword_filled = _fill_by_keywords(conn)
    conn.commit()
    return EnrichmentReport(name="persona", metrics={"상속": inherited, "키워드": keyword_filled})


def extract_targets(text: str) -> tuple[list[str] | None, list[str] | None]:
    """확실한 패턴만 추출. 못 잡으면 (None, None) — 화면에선 '조건 미상'."""
    stages: list[str] = []
    if _PRE_STARTUP.search(text):
        stages.append("PRE_STARTUP")
    for match in _YEARS_UNDER.finditer(text):
        _append_stage(stages, match.group(1))
    audiences: list[str] = []
    if _UNIV_STUDENT.search(text):
        audiences.append("UNIV_STUDENT")
    return stages or None, audiences or None


def _append_stage(stages: list[str], years: str) -> None:
    code = _STAGE_BY_YEARS.get(years)
    if code is not None and code not in stages:
        stages.append(code)


def _fill_by_keywords(conn) -> int:
    filled = 0
    for record_id, title, summary, eligibility_detail in db.fetch_persona_candidates(conn):
        text = " ".join(part for part in (title, summary, eligibility_detail) if part)
        stages, audiences = extract_targets(text)
        if stages is None and audiences is None:
            continue
        db.update_targets(conn, record_id, stages, audiences)
        filled += 1
    return filled

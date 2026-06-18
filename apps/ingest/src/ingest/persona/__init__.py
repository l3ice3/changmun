"""페르소나 부여 3단계 — 직접(수집 시) → 상속(dedup 그룹) → 키워드 규칙 → NULL.

규칙: data-model.md §6-D. 신호 없으면 NULL 유지(억지 채움 금지, AC-009). LLM 호출 금지(MVP).
키워드 규칙은 보수적으로 — 확실한 패턴만 (ingest.md 규칙 6).
"""
import re

from ingest import db
from ingest.report import EnrichmentReport
from ingest.sources import kstartup, ontong_youth

# 소스별 직접 신호 산출 — 분류 칸은 수집이 안 건드리므로 persona가 raw에서 재산출한다 (#11)
_DIRECT_EXTRACTORS = {
    kstartup.SOURCE: kstartup.direct_targets,
    ontong_youth.SOURCE: ontong_youth.direct_targets,
}

_PRE_STARTUP = re.compile(r"예비\s*창업|창업\s*예정|창업\s*준비")
_UNIV_STUDENT = re.compile(r"대학생")
_YEARS_UNDER = re.compile(r"(\d{1,2})\s*년\s*미만")
# 키워드 직후의 제외·부정 표현 — "예비창업자 제외"를 PRE_STARTUP으로 잘못 채우지 않게 (Codex)
_EXCLUSION = re.compile(r"제외|불가|아닌|아님|없는|해당\s*없")
_EXCLUSION_WINDOW = 12

_STAGE_BY_YEARS = {"1": "LT_1Y", "2": "LT_2Y", "3": "LT_3Y", "5": "LT_5Y", "7": "LT_7Y", "10": "LT_10Y"}


def apply(conn) -> EnrichmentReport:
    # 순서 = 신호 강한 순(§6-D): 직접(raw 재산출, 덮어쓰기) → 상속(그룹 union) → 키워드(union)
    direct = _fill_direct(conn)
    inherited = db.inherit_group_targets(conn)
    keyword_filled = _fill_by_keywords(conn)  # commit은 호출자(main._enrich_isolated) 책임
    return EnrichmentReport(
        name="persona", metrics={"직접": direct, "상속": inherited, "키워드": keyword_filled})


def _fill_direct(conn) -> int:
    rows = []
    for record_id, source, raw in db.fetch_direct_inputs(conn):
        extractor = _DIRECT_EXTRACTORS.get(source)
        if extractor is None or raw is None:
            continue
        stages, audiences = extractor(raw)
        rows.append((stages, audiences, record_id))
    db.set_direct_targets(conn, rows)
    return len(rows)


def extract_targets(text: str) -> tuple[list[str] | None, list[str] | None]:
    """확실한 패턴만 추출. 못 잡으면 (None, None) — 화면에선 '조건 미상'.

    키워드 직후에 제외/부정 표현이 붙으면(예: '예비창업자 제외') 채우지 않는다 — 부적격 공고가
    해당 페르소나 탭에 들어가는 잘못된 채움 방지 (Codex).
    """
    stages: list[str] = []
    if _positive_match(_PRE_STARTUP, text):
        stages.append("PRE_STARTUP")
    for match in _YEARS_UNDER.finditer(text):
        if not _is_excluded(text, match.end()):
            _append_stage(stages, match.group(1))
    audiences: list[str] = []
    if _positive_match(_UNIV_STUDENT, text):
        audiences.append("UNIV_STUDENT")
    return stages or None, audiences or None


def _positive_match(pattern: re.Pattern, text: str) -> bool:
    for match in pattern.finditer(text):
        if not _is_excluded(text, match.end()):
            return True
    return False


def _is_excluded(text: str, end: int) -> bool:
    return _EXCLUSION.search(text[end:end + _EXCLUSION_WINDOW]) is not None


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

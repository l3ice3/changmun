"""지원금 배치 단계 — 직접 재산출 + 그룹 상속 (data-model.md §6-E, FR-008).

persona와 동일한 2단 패턴(#11): 수집 UPSERT는 금액 칸을 갱신하지 않으므로(상속값 보존),
① 매 배치 본문에서 직접 추출을 재산출해 덮어쓰고(공고 수정 반영, 결정적)
② dedup 그룹 내 추출값을 NULL인 멤버에 공유한다(자체 추출 우선 — COALESCE, 멱등).
두 단계 모두 후처리 원자 트랜잭션 안에서 실행된다(실패 시 통째 롤백 — 어제 값 보존).
"""
from ingest import db
from ingest.normalize import extract_amounts
from ingest.report import EnrichmentReport


def apply(conn) -> EnrichmentReport:
    extracted = _refresh_direct(conn)
    inherited = db.inherit_group_amounts(conn)
    return EnrichmentReport(name="amounts", metrics={"직접": extracted, "상속": inherited})


def _refresh_direct(conn) -> int:
    updates = []
    filled = 0
    for record_id, summary, category in db.fetch_amount_inputs(conn):
        result = extract_amounts(summary, category=category)
        updates.append(
            (result.max_support_amount, result.total_program_budget, result.source_text, record_id)
        )
        if result.max_support_amount is not None or result.total_program_budget is not None:
            filled += 1
    db.set_direct_amounts(conn, updates)
    return filled

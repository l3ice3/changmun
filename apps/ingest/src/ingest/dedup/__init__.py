"""dedup — 정규화 키 → 블로킹 → 스코어링(0.85) → Union-Find → canonical 선정.

규칙: data-model.md §6-D. 임계 0.85는 engine의 상수(튜닝 대상). 오합치 > 놓침.
"""
from datetime import date

from ingest import db
from ingest.dedup import engine
from ingest.report import EnrichmentReport


def run(conn, today: date | None = None) -> EnrichmentReport:
    """전체 레코드 재평가 — 그룹 보존(비파괴) + canonical 재선정 후 DB 반영."""
    effective_today = today or date.today()
    records = [engine.record_of(row) for row in db.fetch_dedup_rows(conn)]
    assignments = engine.build_assignments(records, effective_today)
    db.apply_dedup(conn, assignments)  # commit은 호출자(main._enrich_isolated) 책임
    grouped = [assignment for assignment in assignments if assignment.group_id is not None]
    group_count = len({assignment.group_id for assignment in grouped})
    non_canonical = sum(1 for assignment in grouped if not assignment.canonical)
    return EnrichmentReport(
        name="dedup",
        metrics={"전체": len(assignments), "그룹": group_count,
                 "그룹화": len(grouped), "비대표": non_canonical},
    )

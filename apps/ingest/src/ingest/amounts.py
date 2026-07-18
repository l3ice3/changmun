"""지원금 그룹 상속 배치 단계 — data-model.md §6-E 규칙 6 (FR-008).

페르소나 상속과 같은 패턴: dedup 그룹 내에서 추출된 금액을 NULL인 멤버에 공유한다.
자체 추출값이 항상 우선(COALESCE)이라 멱등·비파괴다.
"""
from ingest import db
from ingest.report import EnrichmentReport


def apply(conn) -> EnrichmentReport:
    inherited = db.inherit_group_amounts(conn)
    return EnrichmentReport(name="amounts", metrics={"상속": inherited})

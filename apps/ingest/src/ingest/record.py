"""opportunity 테이블 1행에 대응하는 정규화 결과 — db/migrations/V1 스키마와 1:1.

dedup_group_id·is_canonical·first_seen_at·updated_at은 수집 단계 소관이 아니라 제외
(dedup 배치=FR-002, 타임스탬프=DB 기본값/UPSERT가 관리).
"""
from dataclasses import dataclass, field
from datetime import date


@dataclass(frozen=True)
class OpportunityRecord:
    source: str
    external_id: str
    title: str
    detail_url: str
    summary: str | None = None
    category: str | None = None
    region: str | None = None
    organization: str | None = None
    organization_type: str | None = None
    support_amount: str | None = None
    target_startup_stage: list[str] | None = None
    target_audience_type: list[str] | None = None
    eligibility_detail: str | None = None
    application_start_date: date | None = None
    application_deadline: date | None = None
    is_always_open: bool = False
    apply_url: str | None = None
    source_status: str | None = None
    raw: dict = field(default_factory=dict)


@dataclass
class MappingResult:
    """소스 레코드 1건의 매핑 결과 — 적재 대상이거나(record), 스킵 사유가 있다(skip_reason)."""

    record: OpportunityRecord | None
    skip_reason: str | None = None
    unknown_values: list[str] = field(default_factory=list)

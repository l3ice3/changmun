"""DB 적재 — UPSERT: ON CONFLICT (source, external_id).

멱등성은 DB가 보장한다 — 존재 확인 후 INSERT 패턴 금지(레이스). (ingest.md 규칙 3)
UPDATE 시 건드리지 않는 컬럼: first_seen_at(최초 수집 보존), dedup_group_id·is_canonical(FR-002 배치 소관).
"""
from dataclasses import asdict

import psycopg
from psycopg.types.json import Jsonb

from ingest.record import OpportunityRecord

_UPSERT_SQL = """
INSERT INTO opportunity (
    source, external_id, title, summary, category, region,
    organization, organization_type, support_amount,
    target_startup_stage, target_audience_type, eligibility_detail,
    application_start_date, application_deadline, is_always_open,
    detail_url, apply_url, source_status, raw
) VALUES (
    %(source)s, %(external_id)s, %(title)s, %(summary)s, %(category)s, %(region)s,
    %(organization)s, %(organization_type)s, %(support_amount)s,
    %(target_startup_stage)s, %(target_audience_type)s, %(eligibility_detail)s,
    %(application_start_date)s, %(application_deadline)s, %(is_always_open)s,
    %(detail_url)s, %(apply_url)s, %(source_status)s, %(raw)s
)
ON CONFLICT (source, external_id) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    category = EXCLUDED.category,
    region = EXCLUDED.region,
    organization = EXCLUDED.organization,
    organization_type = EXCLUDED.organization_type,
    support_amount = EXCLUDED.support_amount,
    target_startup_stage = EXCLUDED.target_startup_stage,
    target_audience_type = EXCLUDED.target_audience_type,
    eligibility_detail = EXCLUDED.eligibility_detail,
    application_start_date = EXCLUDED.application_start_date,
    application_deadline = EXCLUDED.application_deadline,
    is_always_open = EXCLUDED.is_always_open,
    detail_url = EXCLUDED.detail_url,
    apply_url = EXCLUDED.apply_url,
    source_status = EXCLUDED.source_status,
    raw = EXCLUDED.raw,
    updated_at = now()
RETURNING (xmax = 0) AS inserted
"""


def connect(dsn: str) -> psycopg.Connection:
    return psycopg.connect(dsn)


def upsert_records(conn, records: list[OpportunityRecord]) -> tuple[int, int]:
    """배치 UPSERT → (신규, 갱신) 건수. xmax=0이면 INSERT, 아니면 UPDATE."""
    if not records:
        return 0, 0
    new = updated = 0
    with conn.cursor() as cursor:
        cursor.executemany(_UPSERT_SQL, [_to_params(r) for r in records], returning=True)
        while True:
            inserted = cursor.fetchone()[0]
            if inserted:
                new += 1
            else:
                updated += 1
            if not cursor.nextset():
                break
    return new, updated


def _to_params(record: OpportunityRecord) -> dict:
    params = asdict(record)
    params["raw"] = Jsonb(params["raw"])
    return params

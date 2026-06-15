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


# dedup 입력 — info_count는 canonical 동순위 판정용 "채워진 컬럼 수" (§6-D 규칙 5)
_DEDUP_ROWS_SQL = """
SELECT id, source, title, organization, application_start_date, application_deadline, is_always_open,
       num_nonnulls(summary, category, region, organization, organization_type, support_amount,
                    target_startup_stage, target_audience_type, eligibility_detail,
                    application_start_date, application_deadline, apply_url) AS info_count,
       dedup_group_id
FROM opportunity
"""

_APPLY_DEDUP_SQL = "UPDATE opportunity SET dedup_group_id = %s, is_canonical = %s WHERE id = %s"

# 페르소나 2단계(상속): 그룹 내 K-Startup 신호를 타 출처의 NULL 컬럼에만 채운다 (§6-D — 직접 신호 우선)
_INHERIT_TARGETS_SQL = """
WITH donor AS (
    SELECT DISTINCT ON (dedup_group_id)
           dedup_group_id, target_startup_stage, target_audience_type
    FROM opportunity
    WHERE source = 'k-startup'
      AND dedup_group_id IS NOT NULL
      AND (target_startup_stage IS NOT NULL OR target_audience_type IS NOT NULL)
    ORDER BY dedup_group_id, is_canonical DESC, id
)
UPDATE opportunity AS member
SET target_startup_stage = COALESCE(member.target_startup_stage, donor.target_startup_stage),
    target_audience_type = COALESCE(member.target_audience_type, donor.target_audience_type)
FROM donor
WHERE member.dedup_group_id = donor.dedup_group_id
  AND member.source <> 'k-startup'
  AND (member.target_startup_stage IS NULL OR member.target_audience_type IS NULL)
"""

# 한 축이라도 비면 후보 — YOUTH(audience)가 채워져도 비어있는 stage는 키워드로 채운다.
# update_targets가 COALESCE라 이미 있는 값은 안 덮으므로 OR 조건이 안전하다.
_PERSONA_CANDIDATES_SQL = """
SELECT id, title, summary, eligibility_detail
FROM opportunity
WHERE target_startup_stage IS NULL OR target_audience_type IS NULL
"""

_UPDATE_TARGETS_SQL = """
UPDATE opportunity
SET target_startup_stage = COALESCE(target_startup_stage, %s),
    target_audience_type = COALESCE(target_audience_type, %s)
WHERE id = %s
"""


def connect(dsn: str) -> psycopg.Connection:
    return psycopg.connect(dsn)


def fetch_dedup_rows(conn) -> list[tuple]:
    with conn.cursor() as cursor:
        cursor.execute(_DEDUP_ROWS_SQL)
        return cursor.fetchall()


def apply_dedup(conn, assignments) -> None:
    if not assignments:
        return
    rows = [(item.group_id, item.canonical, item.record_id) for item in assignments]
    with conn.cursor() as cursor:
        cursor.executemany(_APPLY_DEDUP_SQL, rows)


def inherit_group_targets(conn) -> int:
    with conn.cursor() as cursor:
        cursor.execute(_INHERIT_TARGETS_SQL)
        return cursor.rowcount


def fetch_persona_candidates(conn) -> list[tuple]:
    with conn.cursor() as cursor:
        cursor.execute(_PERSONA_CANDIDATES_SQL)
        return cursor.fetchall()


def update_targets(conn, record_id: int, stages: list[str] | None, audiences: list[str] | None) -> None:
    with conn.cursor() as cursor:
        cursor.execute(_UPDATE_TARGETS_SQL, (stages, audiences, record_id))


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

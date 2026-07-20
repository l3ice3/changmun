"""DB 적재 — UPSERT: ON CONFLICT (source, external_id).

멱등성은 DB가 보장한다 — 존재 확인 후 INSERT 패턴 금지(레이스). (ingest.md 규칙 3)

컬럼은 소관별로 나뉜다 (책임 분리):
- _KEY_COLUMNS       : 멱등 키. ON CONFLICT 대상.
- _COLLECTED_COLUMNS : 수집이 매 배치 최신으로 갱신하는 원본 칸. UPSERT의 UPDATE 대상.
- _ENRICHED_COLUMNS  : 분류 칸(페르소나). INSERT엔 수집이 산출한 '직접 신호'를 저장한다(신규 행이
                       후처리 rollback돼도 페르소나 탭에서 누락되지 않게, Codex). UPDATE에선 제외해
                       dedup/persona가 채운 상속·키워드를 보존한다(#11). 직접 신호 '갱신'(공고 수정 반영)은
                       persona 직접 단계가 매 배치 수행 → 신규 보존·갱신·enrichment 보존을 모두 만족.
- (미포함) dedup_group_id·is_canonical : 수집이 INSERT에도 안 넣어 DB 기본값 → dedup이 채운다.
- (미포함) first_seen_at : 최초 수집 시각 보존(UPDATE 안 함) / updated_at : 매 UPSERT now()로 갱신.
"""
from dataclasses import asdict

import psycopg
from psycopg.types.json import Jsonb

from ingest.record import OpportunityRecord

_KEY_COLUMNS = ("source", "external_id")
_COLLECTED_COLUMNS = (
    "title", "summary", "category", "region", "organization", "organization_type",
    "eligibility_detail", "application_start_date", "application_deadline",
    "is_always_open", "detail_url", "apply_url", "source_status", "raw",
)
# 금액 3컬럼도 분류 칸과 같은 취급(#11 패턴, Codex): 수집 UPDATE가 그룹 상속값을 NULL로
# 덮으면 후처리 실패 시 상속이 유실된다 → INSERT에만 직접 추출값을 넣고, 갱신(본문 변경
# 반영)은 amounts 후처리 단계가 매 배치 재산출한다.
_ENRICHED_COLUMNS = (
    "target_startup_stage", "target_audience_type",
    "support_amount", "max_support_amount", "total_program_budget",
)


def _build_upsert_sql() -> str:
    # INSERT엔 분류 칸의 직접 신호를 저장(신규 행이 후처리 rollback돼도 보존)하되, UPDATE 절에선 제외해
    # enrichment(상속·키워드)를 수집이 덮지 않게 한다 (#11, Codex).
    insert_columns = _KEY_COLUMNS + _COLLECTED_COLUMNS + _ENRICHED_COLUMNS
    values = ", ".join(f"%({column})s" for column in insert_columns)
    update_sets = ",\n    ".join(f"{column} = EXCLUDED.{column}" for column in _COLLECTED_COLUMNS)
    return (
        f"INSERT INTO opportunity ({', '.join(insert_columns)})\n"
        f"VALUES ({values})\n"
        f"ON CONFLICT (source, external_id) DO UPDATE SET\n"
        f"    {update_sets},\n"
        f"    updated_at = now()\n"
        f"RETURNING (xmax = 0) AS inserted"
    )


_UPSERT_SQL = _build_upsert_sql()


# dedup 입력 — info_count는 canonical 동순위 판정용 "채워진 컬럼 수" (§6-D 규칙 5).
# 마지막 4개 = 기관 후보(소관·수행, bizinfo/온통청년 raw) — organization 단일 값만으로는
# 소스 간 표기 차이(소관부처 vs 수행기관)로 기관일치가 깨진다 (engine.record_of 참조).
_DEDUP_ROWS_SQL = """
SELECT id, source, title, organization, region,
       application_start_date, application_deadline, is_always_open,
       num_nonnulls(summary, category, region, organization, organization_type, support_amount,
                    target_startup_stage, target_audience_type, eligibility_detail,
                    application_start_date, application_deadline, apply_url) AS info_count,
       dedup_group_id,
       raw->>'jrsdInsttNm', raw->>'excInsttNm',
       raw->>'sprvsnInstCdNm', raw->>'operInstCdNm'
FROM opportunity
"""

_APPLY_DEDUP_SQL = "UPDATE opportunity SET dedup_group_id = %s, is_canonical = %s WHERE id = %s"

# 페르소나 1단계(직접): raw 직접 신호를 매 배치 재산출해 덮어쓴다 — 분류 칸을 수집이 안 건드리므로(#11)
# 직접 신호도 여기서 최신화한다(공고 수정·매핑 보강 반영). 이후 상속·키워드가 union으로 보강한다.
_DIRECT_INPUTS_SQL = "SELECT id, source, raw FROM opportunity"
_SET_DIRECT_TARGETS_SQL = (
    "UPDATE opportunity SET target_startup_stage = %s, target_audience_type = %s WHERE id = %s"
)

# 페르소나 2단계(상속): 그룹 내 K-Startup 타깃을 타 출처와 '합집합'으로 공유한다 (§6-D: 그룹 전체가 공유).
# COALESCE(NULL 컬럼만 채움)는 멤버가 부분 신호(예: 온통 ['YOUTH'])를 가지면 donor의 더 풍부한 값을
# 버려, AC-010 승격 시 대학생 탭에서 누락된다 → 멤버 직접 신호를 보존하며 배열을 union (중복 제거).
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
SET target_startup_stage = (
        SELECT array_agg(DISTINCT code ORDER BY code)
        FROM unnest(COALESCE(member.target_startup_stage, '{}'::text[])
                    || COALESCE(donor.target_startup_stage, '{}'::text[])) AS code
    ),
    target_audience_type = (
        SELECT array_agg(DISTINCT code ORDER BY code)
        FROM unnest(COALESCE(member.target_audience_type, '{}'::text[])
                    || COALESCE(donor.target_audience_type, '{}'::text[])) AS code
    )
FROM donor
WHERE member.dedup_group_id = donor.dedup_group_id
  AND member.source <> 'k-startup'
"""

# 지원금 그룹 상속 (§6-E 규칙 6): 그룹 내 추출값을 NULL인 멤버에만 공유(자체 추출 우선 — COALESCE).
# donor는 컬럼별로 집계한다 — 최대액과 총예산이 서로 다른 출처에서 추출된 그룹에서 단일 donor
# 행을 고르면 한쪽 값이 탈락한다(Codex). 컬럼별 max = "적용 가능한 최대"(FR-008)와도 일치.
# 원문 표기(support_amount)는 최대액이 가장 큰 행의 것을 따른다. K-Startup은 본문에
# 금액이 없어(첨부 구조) 이 상속이 주 채움 경로다.
_INHERIT_AMOUNTS_SQL = """
WITH ranked AS (
    SELECT dedup_group_id, max_support_amount, total_program_budget,
           first_value(support_amount) OVER (
               PARTITION BY dedup_group_id
               ORDER BY max_support_amount DESC NULLS LAST,
                        total_program_budget DESC NULLS LAST, id
           ) AS donor_text
    FROM opportunity
    WHERE dedup_group_id IS NOT NULL
),
donor AS (
    SELECT dedup_group_id,
           max(max_support_amount)   AS max_support_amount,
           max(total_program_budget) AS total_program_budget,
           min(donor_text)           AS support_amount
    FROM ranked
    GROUP BY dedup_group_id
    HAVING max(max_support_amount) IS NOT NULL OR max(total_program_budget) IS NOT NULL
)
UPDATE opportunity AS member
SET max_support_amount   = COALESCE(member.max_support_amount, donor.max_support_amount),
    total_program_budget = COALESCE(member.total_program_budget, donor.total_program_budget),
    support_amount       = COALESCE(NULLIF(member.support_amount, ''), donor.support_amount)
FROM donor
WHERE member.dedup_group_id = donor.dedup_group_id
  AND (member.max_support_amount   IS DISTINCT FROM COALESCE(member.max_support_amount, donor.max_support_amount)
       OR member.total_program_budget IS DISTINCT FROM COALESCE(member.total_program_budget, donor.total_program_budget)
       OR NULLIF(member.support_amount, '') IS DISTINCT FROM COALESCE(NULLIF(member.support_amount, ''), donor.support_amount))
"""

# 한 축이라도 비면 후보 — YOUTH(audience)가 채워져도 비어있는 stage는 키워드로 채운다.
# update_targets가 COALESCE라 이미 있는 값은 안 덮으므로 OR 조건이 안전하다.
_PERSONA_CANDIDATES_SQL = """
SELECT id, title, summary, eligibility_detail
FROM opportunity
WHERE target_startup_stage IS NULL OR target_audience_type IS NULL
"""

# 키워드 추출 결과도 기존 배열에 union — 멤버가 부분 신호(['YOUTH'])를 가져도 추출 코드(UNIV_STUDENT)를
# 추가해 대학생 탭 누락을 막는다 (상속과 같은 이유 — Codex). 직접 신호는 보존, 중복 제거.
_UPDATE_TARGETS_SQL = """
UPDATE opportunity
SET target_startup_stage = (
        SELECT array_agg(DISTINCT code ORDER BY code)
        FROM unnest(COALESCE(target_startup_stage, '{}'::text[])
                    || COALESCE(%s::text[], '{}'::text[])) AS code
    ),
    target_audience_type = (
        SELECT array_agg(DISTINCT code ORDER BY code)
        FROM unnest(COALESCE(target_audience_type, '{}'::text[])
                    || COALESCE(%s::text[], '{}'::text[])) AS code
    )
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


def fetch_direct_inputs(conn) -> list[tuple]:
    with conn.cursor() as cursor:
        cursor.execute(_DIRECT_INPUTS_SQL)
        return cursor.fetchall()


def set_direct_targets(conn, rows: list[tuple]) -> None:
    """직접 신호 일괄 덮어쓰기 — rows: [(stages, audiences, record_id), ...]."""
    if not rows:
        return
    with conn.cursor() as cursor:
        cursor.executemany(_SET_DIRECT_TARGETS_SQL, rows)


def inherit_group_targets(conn) -> int:
    with conn.cursor() as cursor:
        cursor.execute(_INHERIT_TARGETS_SQL)
        return cursor.rowcount


def inherit_group_amounts(conn) -> int:
    with conn.cursor() as cursor:
        cursor.execute(_INHERIT_AMOUNTS_SQL)
        return cursor.rowcount


# 금액 직접 재산출 입력·갱신 — persona 직접 단계와 동일 패턴(수집은 분류/금액 칸을 안 건드림)
_AMOUNT_INPUTS_SQL = "SELECT id, summary, category FROM opportunity"
_SET_AMOUNTS_SQL = (
    "UPDATE opportunity"
    " SET max_support_amount = %s, total_program_budget = %s, support_amount = %s"
    " WHERE id = %s"
)


def fetch_amount_inputs(conn) -> list[tuple]:
    with conn.cursor() as cursor:
        cursor.execute(_AMOUNT_INPUTS_SQL)
        return cursor.fetchall()


def set_direct_amounts(conn, rows: list[tuple]) -> None:
    """직접 추출값 일괄 덮어쓰기 — rows: [(max, budget, source_text, record_id), ...]."""
    if not rows:
        return
    with conn.cursor() as cursor:
        cursor.executemany(_SET_AMOUNTS_SQL, rows)


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

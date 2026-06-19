"""UPSERT 멱등성 통합 테스트 — AC-002. 로컬 PostgreSQL(docker compose) 필요, 없으면 skip."""
import os

import pytest

from ingest import db
from ingest.config import DEFAULT_DSN
from ingest.record import OpportunityRecord

DSN = os.environ.get("DATABASE_URL", DEFAULT_DSN)
TEST_SOURCE = "pytest-fr001"  # 실데이터와 섞이지 않도록 전용 source 값 사용 후 정리


def make_record(external_id: str, title: str) -> OpportunityRecord:
    return OpportunityRecord(
        source=TEST_SOURCE,
        external_id=external_id,
        title=title,
        detail_url=f"https://example.test/{external_id}",
        target_startup_stage=["PRE_STARTUP"],
        raw={"pbanc_sn": external_id, "biz_pbanc_nm": title},
    )


@pytest.fixture
def conn():
    try:
        connection = db.connect(DSN)
    except Exception:
        pytest.skip("로컬 PostgreSQL 미가동 — docker compose up -d 후 실행")
    try:
        yield connection
    finally:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM opportunity WHERE source = %s", (TEST_SOURCE,))
        connection.commit()
        connection.close()


def fetch_rows(conn):
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT external_id, title, first_seen_at, updated_at, dedup_group_id, is_canonical"
            " FROM opportunity WHERE source = %s ORDER BY external_id",
            (TEST_SOURCE,),
        )
        return cursor.fetchall()


class TestIdempotency:
    def test_rerun_updates_instead_of_duplicating(self, conn):
        records = [make_record("1", "공고 A"), make_record("2", "공고 B")]

        first = db.upsert_records(conn, records)
        conn.commit()
        assert first == (2, 0)  # 전부 신규
        rows_after_first = fetch_rows(conn)
        assert len(rows_after_first) == 2

        rerun = [make_record("1", "공고 A (제목 갱신)"), make_record("2", "공고 B")]
        second = db.upsert_records(conn, rerun)
        conn.commit()
        assert second == (0, 2)  # 전부 갱신 — 중복 행 생성 없음 (AC-002)

        rows = fetch_rows(conn)
        assert len(rows) == 2
        first_row = rows[0]
        assert first_row[1] == "공고 A (제목 갱신)"
        # first_seen_at 보존, updated_at 갱신 (data-model §2 — last_seen_at 역할)
        assert first_row[2] == rows_after_first[0][2]
        assert first_row[3] > rows_after_first[0][3]
        # dedup 컬럼은 수집이 건드리지 않음 (FR-002 소관) — 기본값 유지
        assert first_row[4] is None
        assert first_row[5] is True

    def test_empty_batch_is_noop(self, conn):
        assert db.upsert_records(conn, []) == (0, 0)

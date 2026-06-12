"""dedup·persona DB 통합 테스트 — AC-006·007·008·009·010. 로컬 PostgreSQL 필요, 없으면 skip."""
import os
from datetime import date

import pytest

from ingest import db, dedup, persona
from ingest.config import DEFAULT_DSN

DSN = os.environ.get("DATABASE_URL", DEFAULT_DSN)
PREFIX = "pytest-fr002-"
FAR_DEADLINE = date(2099, 6, 30)
OTHER_DEADLINE = date(2099, 7, 15)

INSERT_SQL = """
INSERT INTO opportunity (source, external_id, title, organization, target_startup_stage,
                         application_start_date, application_deadline, detail_url)
VALUES (%s, %s, %s, %s, %s, %s, %s, 'https://example.test/fr002')
RETURNING id
"""


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
            cursor.execute("DELETE FROM opportunity WHERE external_id LIKE %s", (PREFIX + "%",))
        connection.commit()
        connection.close()


def insert_row(conn, source, suffix, title, **fields):
    organization = fields.get("organization", "중소벤처기업부")
    stages = fields.get("stages")
    start_date = fields.get("start_date", date(2099, 6, 1))
    deadline = fields.get("deadline", FAR_DEADLINE)
    with conn.cursor() as cursor:
        cursor.execute(INSERT_SQL, (source, PREFIX + suffix, title, organization, stages, start_date, deadline))
        row_id = cursor.fetchone()[0]
    conn.commit()
    return row_id


def fetch_state(conn, row_id):
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT dedup_group_id, is_canonical, target_startup_stage FROM opportunity WHERE id = %s",
            (row_id,),
        )
        return cursor.fetchone()


class TestDedupAndPersonaFlow:
    def test_merge_inherit_and_isolation(self, conn):
        kstartup_id = insert_row(conn, "k-startup", "a",
                                 "2099년 예비창업패키지 창업자 모집 공고", stages=["PRE_STARTUP"])
        ontong_id = insert_row(conn, "ontong-youth", "b", "[전국] 예비창업패키지 창업자 모집")
        lone_id = insert_row(conn, "ontong-youth", "c", "시니어 기술창업 공간 임차 지원",
                             organization="고령군청", deadline=OTHER_DEADLINE)

        dedup.run(conn)
        persona.apply(conn)

        kstartup_state = fetch_state(conn, kstartup_id)
        ontong_state = fetch_state(conn, ontong_id)
        lone_state = fetch_state(conn, lone_id)
        # AC-006: 같은 그룹 + canonical은 K-Startup 1건
        assert kstartup_state[0] == ontong_state[0] == min(kstartup_id, ontong_id)
        assert kstartup_state[1] is True
        assert ontong_state[1] is False
        # AC-007: 그룹 상속으로 온통청년 레코드가 PRE_STARTUP을 공유
        assert ontong_state[2] == ["PRE_STARTUP"]
        # AC-008·009: 다른 공고는 미병합, 신호 없으면 NULL 유지
        assert lone_state[0] is None
        assert lone_state[2] is None

    def test_closed_canonical_repromoted(self, conn):
        """AC-010: canonical이 마감되면 진행 중 레코드가 승격된다 (그룹 보존)."""
        kstartup_id = insert_row(conn, "k-startup", "d",
                                 "2099년 예비창업패키지 창업자 모집 공고", stages=["PRE_STARTUP"])
        ontong_id = insert_row(conn, "ontong-youth", "e", "[전국] 예비창업패키지 창업자 모집")
        dedup.run(conn)

        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE opportunity SET application_deadline = %s WHERE id = %s",
                (date(2026, 1, 1), kstartup_id),
            )
        conn.commit()
        dedup.run(conn)

        assert fetch_state(conn, kstartup_id)[1] is False
        assert fetch_state(conn, ontong_id)[1] is True
        assert fetch_state(conn, kstartup_id)[0] == fetch_state(conn, ontong_id)[0]

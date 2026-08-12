"""dedup·persona DB 통합 테스트 — AC-006·007·008·009·010·030. 로컬 PostgreSQL 필요, 없으면 skip."""
from datetime import date

import pytest
from conftest import connect_or_skip

from ingest import amounts, dedup, persona

PREFIX = "pytest-fr002-"
FAR_DEADLINE = date(2099, 6, 30)
OTHER_DEADLINE = date(2099, 7, 15)

INSERT_SQL = """
INSERT INTO opportunity (source, external_id, title, organization, target_startup_stage,
                         application_start_date, application_deadline, summary, detail_url)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'https://example.test/fr002')
RETURNING id
"""


@pytest.fixture
def conn():
    # 절대 commit하지 않는다 — dedup.run은 전체 테이블을 재평가/UPDATE하므로,
    # commit하면 개발 DB의 실데이터 dedup_group_id·is_canonical까지 덮어쓴다.
    # 모든 변경을 한 트랜잭션에 쌓고 끝에 rollback해 실데이터를 보존한다 (테스트 격리).
    connection = connect_or_skip()
    try:
        yield connection
    finally:
        connection.rollback()
        connection.close()


def insert_row(conn, source, suffix, title, **fields):
    organization = fields.get("organization", "중소벤처기업부")
    stages = fields.get("stages")
    start_date = fields.get("start_date", date(2099, 6, 1))
    deadline = fields.get("deadline", FAR_DEADLINE)
    summary = fields.get("summary")
    with conn.cursor() as cursor:
        cursor.execute(
            INSERT_SQL,
            (source, PREFIX + suffix, title, organization, stages, start_date, deadline, summary),
        )
        row_id = cursor.fetchone()[0]
    return row_id  # commit 안 함 — fixture가 끝에 rollback


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

    def test_inherit_unions_audience_arrays(self, conn):
        """멤버가 부분 신호(['YOUTH'])를 가져도 donor 값을 합집합으로 받는다 — COALESCE 아닌 union (Codex C)."""
        kstartup_id = insert_row(conn, "k-startup", "h",
                                 "2099년 예비창업 창업기업 모집 공고", stages=["PRE_STARTUP"])
        ontong_id = insert_row(conn, "ontong-youth", "i", "예비창업 창업기업 모집 공고")
        with conn.cursor() as cursor:
            cursor.execute("UPDATE opportunity SET target_audience_type=ARRAY['UNIV_STUDENT','GENERAL'] WHERE id=%s",
                           (kstartup_id,))
            cursor.execute("UPDATE opportunity SET target_audience_type=ARRAY['YOUTH'] WHERE id=%s", (ontong_id,))

        dedup.run(conn)
        persona.apply(conn)

        with conn.cursor() as cursor:
            cursor.execute("SELECT target_audience_type, target_startup_stage FROM opportunity WHERE id=%s",
                           (ontong_id,))
            audience, stage = cursor.fetchone()
        assert set(audience) == {"YOUTH", "UNIV_STUDENT", "GENERAL"}  # 멤버 직접신호 YOUTH 보존 + donor union
        assert stage == ["PRE_STARTUP"]  # 멤버 stage 없으니 donor 상속

    def test_keyword_fill_merges_into_existing_audience(self, conn):
        """이미 ['YOUTH']인 행에 '대학생' 텍스트가 있으면 UNIV_STUDENT를 추가(union) — COALESCE 아님 (Codex H)."""
        rid = insert_row(conn, "ontong-youth", "k", "대학생 예비창업자 모집")
        with conn.cursor() as cursor:
            cursor.execute("UPDATE opportunity SET target_audience_type=ARRAY['YOUTH'] WHERE id=%s", (rid,))

        persona.apply(conn)

        with conn.cursor() as cursor:
            cursor.execute("SELECT target_audience_type, target_startup_stage FROM opportunity WHERE id=%s", (rid,))
            audience, stage = cursor.fetchone()
        assert set(audience) == {"YOUTH", "UNIV_STUDENT"}  # 직접신호 YOUTH 보존 + 키워드 UNIV_STUDENT 추가
        assert stage == ["PRE_STARTUP"]  # 예비창업 키워드

    def test_amount_inheritance_and_idempotency(self, conn):
        """AC-030: 본문 재산출 → 그룹 상속, 자체 값 우선, 재실행 멱등 (§6-E 규칙 6, end-to-end)."""
        insert_row(conn, "bizinfo", "m", "2099년 예비창업패키지 창업자 모집 공고",
                   summary="기업당 최대 1.5억원 지원 (총 사업비 100억원)")
        kstartup_id = insert_row(conn, "k-startup", "n", "[전국] 예비창업패키지 창업자 모집")
        own_id = insert_row(conn, "ontong-youth", "o", "예비창업패키지 창업자 모집",
                            summary="과제당 7천만원 지원")

        def snapshot():
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT max_support_amount, total_program_budget, support_amount"
                    " FROM opportunity WHERE id IN (%s, %s) ORDER BY id", (kstartup_id, own_id))
                return cursor.fetchall()

        dedup.run(conn)
        report_first = amounts.apply(conn)
        state_first = snapshot()
        amounts.apply(conn)  # 멱등 = 최종 상태 불변 (재산출→상속이 매 배치 반복되므로 건수는 반복될 수 있음)
        state_second = snapshot()

        with conn.cursor() as cursor:
            cursor.execute("SELECT max_support_amount FROM opportunity WHERE id=%s", (own_id,))
            own_max = cursor.fetchone()[0]
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT max_support_amount, total_program_budget, support_amount"
                " FROM opportunity WHERE id=%s", (kstartup_id,))
            k_state = cursor.fetchone()
        assert k_state == (150000000, 10000000000, "최대 1.5억원")  # NULL 멤버 상속
        assert own_max == 70000000  # 자체 추출값 우선 (COALESCE)
        assert report_first.metrics["직접"] >= 2  # 본문 재산출로 채워진 행
        assert report_first.metrics["상속"] >= 1
        assert state_second == state_first  # AC-030: 2회 실행 결과가 1회와 동일

    def test_amount_inheritance_merges_split_donors(self, conn):
        """최대액·총예산이 서로 다른 출처에서 추출된 그룹 — 컬럼별 donor 집계로 둘 다 상속 (Codex)."""
        insert_row(conn, "bizinfo", "p", "2099년 창업도약패키지 창업기업 모집 공고",
                   summary="기업당 3억원 지원")
        insert_row(conn, "ontong-youth", "q", "[전국] 창업도약패키지 창업기업 모집",
                   summary="총 사업비 500억원")
        null_member_id = insert_row(conn, "k-startup", "r", "창업도약패키지 창업기업 모집")

        dedup.run(conn)
        amounts.apply(conn)

        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT max_support_amount, total_program_budget, support_amount"
                " FROM opportunity WHERE id=%s", (null_member_id,))
            member = cursor.fetchone()
        assert member == (300000000, 50000000000, "기업당 3억원")  # 두 donor의 값을 모두 상속

    def test_inherited_max_overrides_total_only_text(self, conn):
        """총예산 원문만 가진 멤버가 max를 상속받으면 원문도 donor 것을 따른다 — 총예산 문구가
        상속된 max와 함께 기업당 지원액처럼 서빙되는 것 방지 (Codex #69, api-spec §1)."""
        insert_row(conn, "bizinfo", "s", "2099년 초격차 스타트업 창업기업 모집 공고",
                   summary="기업당 최대 1.5억원 지원")
        total_only_id = insert_row(conn, "ontong-youth", "t", "[전국] 초격차 스타트업 창업기업 모집",
                                   summary="총 사업비 100억원 규모")

        def snapshot():
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT max_support_amount, total_program_budget, support_amount"
                    " FROM opportunity WHERE id=%s", (total_only_id,))
                return cursor.fetchone()

        dedup.run(conn)
        amounts.apply(conn)
        state_first = snapshot()
        amounts.apply(conn)
        state_second = snapshot()

        # max 상속 → 원문도 donor의 max 문구로 덮임(자체 총예산 문구 아님), 자체 총예산 값은 보존
        assert state_first == (150000000, 10000000000, "최대 1.5억원")
        assert state_second == state_first  # 재실행 멱등

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
        dedup.run(conn)

        assert fetch_state(conn, kstartup_id)[1] is False
        assert fetch_state(conn, ontong_id)[1] is True
        assert fetch_state(conn, kstartup_id)[0] == fetch_state(conn, ontong_id)[0]

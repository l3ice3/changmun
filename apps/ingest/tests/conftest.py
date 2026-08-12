"""통합 테스트 공용 — 로컬 PostgreSQL 연결, 없으면 skip.

`connect_timeout` 없이 연결하면 DB 미가동 시 psycopg가 응답을 무한정 기다린다.
그러면 `except → pytest.skip`이 영영 실행되지 않아 **skip이 아니라 행(hang)** 이 된다
(로컬에선 테스트가 안 끝나고, CI에선 잡 타임아웃까지 러너를 붙잡는다).
멈추는 센서는 실패하는 센서보다 나쁘다 — 연결은 반드시 시간 안에 포기해야 한다.
"""

import os

import pytest

from ingest import db
from ingest.config import DEFAULT_DSN

CONNECT_TIMEOUT_SECONDS = 3

_BASE_DSN = os.environ.get("DATABASE_URL", DEFAULT_DSN)
TEST_DSN = f"{_BASE_DSN}{'&' if '?' in _BASE_DSN else '?'}connect_timeout={CONNECT_TIMEOUT_SECONDS}"

SKIP_REASON = "로컬 PostgreSQL 미가동 — docker compose up -d 후 실행"

# CI처럼 DB가 반드시 있어야 하는 환경에서는 skip이 곧 게이트 구멍이다.
# 연결 실패를 전부 skip으로 삼키면 UPSERT·dedup·페르소나 저장 테스트가 통째로
# 사라진 채 required check가 초록으로 뜬다. 그 환경에선 skip 대신 실패시킨다.
REQUIRE_DB = os.environ.get("INGEST_REQUIRE_DB") == "1"


def connect_or_skip():
    """DB가 없으면 즉시 skip한다(INGEST_REQUIRE_DB=1이면 실패). fixture는 이 함수만 쓴다."""
    try:
        return db.connect(TEST_DSN)
    except Exception as exc:
        if REQUIRE_DB:
            pytest.fail(f"INGEST_REQUIRE_DB=1인데 PostgreSQL 연결 실패({TEST_DSN}): {exc}")
        pytest.skip(SKIP_REASON)

"""파이프라인 오케스트레이션 테스트 — AC-004: 한 단계의 장애가 다른 단계를 막지 않는다."""
from contextlib import nullcontext

from ingest.config import Settings
from ingest.main import run
from ingest.report import EnrichmentReport, SourceReport

SETTINGS = Settings(kstartup_api_key="KEY", ontong_api_key="KEY", database_dsn="postgresql://unused")


class FakeConnection:
    def __init__(self):
        self.rollbacks = 0

    def rollback(self):
        self.rollbacks += 1


def fake_connect_factory(conn):
    return lambda dsn: nullcontext(conn)


def ok_report(name):
    return lambda settings, connection: SourceReport(source=name, fetched=3, new=3)


class TestSourceIsolation:
    def test_one_source_failure_does_not_block_others_and_exit_code_1(self, capsys):
        conn = FakeConnection()
        calls = []

        def ok_source(settings, connection):
            calls.append("ok")
            return SourceReport(source="ok-source", fetched=3, new=3)

        def broken_source(settings, connection):
            raise RuntimeError("API 키 무효")

        exit_code = run(
            settings=SETTINGS,
            collectors={"broken": broken_source, "ok": ok_source},
            connect=fake_connect_factory(conn),
            enrichers={},
        )
        assert exit_code == 1  # 부분 실패를 종료 코드로 표현 (AC-004)
        assert calls == ["ok"]  # 실패한 소스 뒤에도 다음 소스가 실행됨
        assert conn.rollbacks == 1  # 실패 소스의 트랜잭션 정리
        out = capsys.readouterr().out
        assert "[broken] 실패" in out
        assert "[ok-source] fetched=3" in out

    def test_all_sources_ok_exit_code_0(self, capsys):
        exit_code = run(
            settings=SETTINGS,
            collectors={"ok": ok_report("ok")},
            connect=fake_connect_factory(FakeConnection()),
            enrichers={},
        )
        assert exit_code == 0
        assert "=== 수집 리포트 ===" in capsys.readouterr().out


class TestEnrichmentIsolation:
    def test_enricher_failure_sets_exit_code_and_rolls_back(self, capsys):
        conn = FakeConnection()

        def broken_dedup(connection):
            raise RuntimeError("dedup 오류")

        def ok_persona(connection):
            return EnrichmentReport(name="persona", metrics={"상속": 2})

        exit_code = run(
            settings=SETTINGS,
            collectors={"ok": ok_report("ok")},
            connect=fake_connect_factory(conn),
            enrichers={"dedup": broken_dedup, "persona": ok_persona},
        )
        assert exit_code == 1
        assert conn.rollbacks == 1
        out = capsys.readouterr().out
        assert "[dedup] 실패" in out
        assert "[persona] 상속=2" in out  # 실패한 단계 뒤에도 다음 단계가 실행됨

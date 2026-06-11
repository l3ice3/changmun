"""오케스트레이션: 소스 수집(장애 격리) → 리포트. dedup·페르소나는 FR-002에서 이어 붙인다.

흐름 계약: /.claude/rules/ingest.md. 종료 코드: 0=전체 성공, 1=일부/전체 소스 실패 (AC-004).
"""
import logging
from collections.abc import Callable

from ingest import db
from ingest.config import Settings, load_settings
from ingest.report import SourceReport, format_report
from ingest.sources import kstartup

logger = logging.getLogger(__name__)

Collector = Callable[[Settings, object], SourceReport]


def default_collectors() -> dict[str, Collector]:
    # bizinfo·ontong-youth는 API 키 발급 후 여기 등록만 하면 된다 (소스 격리 구조 동일)
    return {kstartup.SOURCE: kstartup.collect}


def run(
    settings: Settings | None = None,
    collectors: dict[str, Collector] | None = None,
    connect: Callable = db.connect,
) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = settings or load_settings()
    collectors = collectors or default_collectors()
    reports = []
    with connect(settings.database_dsn) as conn:
        for name, collect in collectors.items():
            reports.append(_collect_isolated(name, collect, settings, conn))
    print(format_report(reports))
    return 1 if any(report.failed for report in reports) else 0


def _collect_isolated(name: str, collect: Collector, settings: Settings, conn) -> SourceReport:
    """한 소스의 실패가 다른 소스를 막지 않는다 (AC-004). 실패 시 트랜잭션 정리 후 계속."""
    try:
        return collect(settings, conn)
    except Exception as exc:  # noqa: BLE001 — 소스 단위 격리가 목적
        conn.rollback()
        logger.error("[%s] 소스 수집 실패: %s", name, exc)
        return SourceReport(source=name, failed=True, error=str(exc))

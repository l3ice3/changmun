"""오케스트레이션: 소스 수집(장애 격리) → dedup → 페르소나 → 리포트.

흐름 계약: /.claude/rules/ingest.md. 종료 코드: 0=전체 성공, 1=일부/전체 단계 실패 (AC-004).
"""
import logging
from collections.abc import Callable

from ingest import db, dedup, persona
from ingest.config import Settings, load_settings
from ingest.report import EnrichmentReport, SourceReport, format_report
from ingest.sources import kstartup, ontong_youth

logger = logging.getLogger(__name__)

Collector = Callable[[Settings, object], SourceReport]
Enricher = Callable[[object], EnrichmentReport]


def default_collectors() -> dict[str, Collector]:
    # bizinfo는 API 키 발급 후 여기 등록만 하면 된다 (소스 격리 구조 동일)
    return {
        kstartup.SOURCE: kstartup.collect,
        ontong_youth.SOURCE: ontong_youth.collect,
    }


def default_enrichers() -> dict[str, Enricher]:
    # 순서 = 의존: 직접(raw→target_*, dedup의 info_count 입력) → dedup(그룹) → persona(상속·키워드)
    return {"direct": persona.fill_direct, "dedup": dedup.run, "persona": persona.apply}


def run(
    settings: Settings | None = None,
    collectors: dict[str, Collector] | None = None,
    connect: Callable = db.connect,
    enrichers: dict[str, Enricher] | None = None,
) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = settings or load_settings()
    collectors = collectors or default_collectors()
    if enrichers is None:
        enrichers = default_enrichers()
    source_reports = []
    with connect(settings.database_dsn) as conn:
        for name, collect in collectors.items():
            source_reports.append(_collect_isolated(name, collect, settings, conn))
        enrichment_reports = _run_enrichers(enrichers, conn)
    print(format_report(source_reports, enrichment_reports))
    return _exit_code(source_reports, enrichment_reports)


def _run_enrichers(enrichers: dict[str, Enricher], conn) -> list[EnrichmentReport]:
    """후처리 3단계(직접 → dedup → persona)를 한 트랜잭션으로 — 전체 성공 시에만 commit한다.

    단계마다 따로 commit하면, 직접 단계가 분류 칸을 덮어쓴 직후(상속·키워드 적용 전) 상태가
    노출돼 페르소나가 일시 빈다(Codex). 어느 단계든 실패하면 통째로 rollback해 어제 값을 보존한다.
    이로써 "후처리 실패가 노출 분류를 무효화하지 않는다"는 격리 의도가 원자적으로 지켜진다.
    """
    reports: list[EnrichmentReport] = []
    try:
        for _name, enrich in enrichers.items():
            reports.append(enrich(conn))
    except Exception as exc:  # noqa: BLE001 — 후처리 원자성이 목적
        conn.rollback()
        logger.error("후처리 실패 — 전체 롤백(원자적): %s", exc)
        return [EnrichmentReport(name=name, failed=True, error="후처리 원자 롤백") for name in enrichers]
    conn.commit()
    return reports


def _collect_isolated(name: str, collect: Collector, settings: Settings, conn) -> SourceReport:
    """한 소스의 실패가 다른 소스를 막지 않는다 (AC-004). 실패 시 트랜잭션 정리 후 계속."""
    try:
        return collect(settings, conn)
    except Exception as exc:  # noqa: BLE001 — 소스 단위 격리가 목적
        conn.rollback()
        logger.error("[%s] 소스 수집 실패: %s", name, exc)
        return SourceReport(source=name, failed=True, error=str(exc))


def _exit_code(source_reports: list[SourceReport], enrichment_reports: list[EnrichmentReport]) -> int:
    source_failed = any(report.failed for report in source_reports)
    enrichment_failed = any(report.failed for report in enrichment_reports)
    if source_failed or enrichment_failed:
        return 1
    return 0

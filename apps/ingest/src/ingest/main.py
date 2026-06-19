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
    # 순서 보장: dedup(그룹) → persona(상속이 그룹에 의존)
    return {"dedup": dedup.run, "persona": persona.apply}


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
    """후처리는 의존 파이프라인(dedup → persona) — 선행 단계가 실패하면 후속 단계를 건너뛴다.

    persona 상속은 dedup_group_id를 읽으므로, dedup 실패 후 persona를 돌리면
    stale·누락 그룹으로 잘못된 값을 커밋한다. 그래서 의존 단계는 스킵한다.
    """
    reports: list[EnrichmentReport] = []
    upstream_failed = False
    for name, enrich in enrichers.items():
        if upstream_failed:
            reports.append(EnrichmentReport(name=name, failed=True, error="선행 단계 실패로 건너뜀"))
            continue
        report = _enrich_isolated(name, enrich, conn)
        upstream_failed = report.failed
        reports.append(report)
    return reports


def _collect_isolated(name: str, collect: Collector, settings: Settings, conn) -> SourceReport:
    """한 소스의 실패가 다른 소스를 막지 않는다 (AC-004). 실패 시 트랜잭션 정리 후 계속."""
    try:
        return collect(settings, conn)
    except Exception as exc:  # noqa: BLE001 — 소스 단위 격리가 목적
        conn.rollback()
        logger.error("[%s] 소스 수집 실패: %s", name, exc)
        return SourceReport(source=name, failed=True, error=str(exc))


def _enrich_isolated(name: str, enrich: Enricher, conn) -> EnrichmentReport:
    """후처리 실패가 수집 결과를 무효화하지 않는다 — 다음 배치에서 재평가 가능(전체 재계산).

    commit은 여기(호출자)서 한다 — dedup·persona는 쓰기만 하고 트랜잭션 경계를 모른다.
    덕분에 통합 테스트는 commit 없이 호출 후 rollback해 실데이터를 보존할 수 있다.
    """
    try:
        report = enrich(conn)
        conn.commit()
        return report
    except Exception as exc:  # noqa: BLE001 — 단계 격리가 목적
        conn.rollback()
        logger.error("[%s] 후처리 실패: %s", name, exc)
        return EnrichmentReport(name=name, failed=True, error=str(exc))


def _exit_code(source_reports: list[SourceReport], enrichment_reports: list[EnrichmentReport]) -> int:
    source_failed = any(report.failed for report in source_reports)
    enrichment_failed = any(report.failed for report in enrichment_reports)
    if source_failed or enrichment_failed:
        return 1
    return 0

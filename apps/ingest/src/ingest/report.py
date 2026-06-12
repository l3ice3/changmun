"""수집 리포트 — 소스별 신규/갱신/스킵/미지값 건수 (DoD: 일 1회 정상 생성)."""
from dataclasses import dataclass, field


@dataclass
class SourceReport:
    source: str
    fetched: int = 0
    new: int = 0
    updated: int = 0
    skipped: int = 0
    unknown_values: list[str] = field(default_factory=list)
    failed: bool = False
    error: str | None = None

    def summary_line(self) -> str:
        if self.failed:
            return f"[{self.source}] 실패 — {self.error}"
        return (
            f"[{self.source}] fetched={self.fetched} 신규={self.new} "
            f"갱신={self.updated} 스킵={self.skipped} 미지값={len(self.unknown_values)}"
        )


@dataclass
class EnrichmentReport:
    """수집 후처리(dedup·persona) 결과 — 단계별 건수 리포트 (DoD 항목)."""

    name: str
    metrics: dict[str, int] = field(default_factory=dict)
    failed: bool = False
    error: str | None = None

    def summary_line(self) -> str:
        if self.failed:
            return f"[{self.name}] 실패 — {self.error}"
        joined = " ".join(f"{key}={value}" for key, value in self.metrics.items())
        return f"[{self.name}] {joined}"


def format_report(
    source_reports: list[SourceReport],
    enrichment_reports: list[EnrichmentReport] | None = None,
) -> str:
    lines = ["=== 수집 리포트 ==="]
    lines.extend(report.summary_line() for report in source_reports)
    if enrichment_reports:
        lines.append("--- 후처리 (dedup·persona) ---")
        lines.extend(report.summary_line() for report in enrichment_reports)
    unknown = [value for report in source_reports for value in report.unknown_values]
    if unknown:
        lines.append(f"--- 미지값 상세 (총 {len(unknown)}건, 최대 20건 표시) ---")
        lines.extend(unknown[:20])
    return "\n".join(lines)

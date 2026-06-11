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


def format_report(reports: list[SourceReport]) -> str:
    lines = ["=== 수집 리포트 ==="]
    lines.extend(report.summary_line() for report in reports)
    unknown = [value for report in reports for value in report.unknown_values]
    if unknown:
        lines.append(f"--- 미지값 상세 (총 {len(unknown)}건, 최대 20건 표시) ---")
        lines.extend(unknown[:20])
    return "\n".join(lines)

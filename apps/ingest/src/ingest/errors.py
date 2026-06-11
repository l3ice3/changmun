class SourceError(RuntimeError):
    """소스 단위 수집 실패 — 재시도 소진·키 미설정 등. 다른 소스 진행을 막지 않는다 (AC-004)."""

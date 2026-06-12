"""페르소나 키워드 규칙(3단계) 단위 테스트 — 보수적 추출, 못 잡으면 NULL (AC-009)."""
from ingest.persona import extract_targets


class TestExtractTargets:
    def test_pre_startup_keyword(self):
        stages, audiences = extract_targets("예비창업자 및 예비 창업팀 모집")
        assert stages == ["PRE_STARTUP"]
        assert audiences is None

    def test_years_under_pattern(self):
        stages, _ = extract_targets("업력 3년 미만 기업 대상")
        assert stages == ["LT_3Y"]

    def test_combined_signals(self):
        stages, audiences = extract_targets("예비창업자와 대학생, 창업 7년 미만 기업")
        assert stages == ["PRE_STARTUP", "LT_7Y"]
        assert audiences == ["UNIV_STUDENT"]

    def test_unsupported_years_ignored(self):
        stages, _ = extract_targets("업력 4년 미만")  # 표준 코드 없음 → 채우지 않음
        assert stages is None

    def test_no_signal_returns_null(self):
        stages, audiences = extract_targets("소상공인 경영 안정 자금 지원")
        assert stages is None
        assert audiences is None

    def test_weak_signal_not_stretched(self):
        # "대학" 단독·"창업" 단독은 신호로 보지 않는다 — 억지 채움 금지
        stages, audiences = extract_targets("대학 연계 창업 인프라 구축")
        assert stages is None
        assert audiences is None

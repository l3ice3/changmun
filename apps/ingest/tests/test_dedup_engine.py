"""dedup 단위 테스트 — 정규화 키·유사도·스코어링·그룹핑·canonical (AC-006·008·010)."""
from datetime import date

from ingest.dedup import engine
from ingest.dedup.engine import Assignment, DedupRecord
from ingest.dedup.keys import norm_org, norm_title, veto_tokens
from ingest.dedup.similarity import trigram_similarity

TODAY = date(2026, 6, 12)
DEADLINE = date(2026, 6, 30)


def record(record_id, source, title, **overrides) -> DedupRecord:
    values = {
        "record_id": record_id,
        "source": source,
        "norm_title": norm_title(title),
        "veto_tokens": veto_tokens(title),
        "norm_org": norm_org(overrides.pop("organization", "중소벤처기업부")),
        "start_date": overrides.pop("start_date", date(2026, 6, 1)),
        "deadline": overrides.pop("deadline", DEADLINE),
        "always_open": overrides.pop("always_open", False),
        "info_count": overrides.pop("info_count", 10),
        "group_id": overrides.pop("group_id", None),
    }
    return DedupRecord(**values)


def by_id(assignments: list[Assignment]) -> dict[int, Assignment]:
    return {assignment.record_id: assignment for assignment in assignments}


class TestNormKeys:
    def test_norm_title_strips_noise(self):
        # [지역] 접두 · 연도 · 차수 · 상투어 제거 + 구분자 통일 (§6-D 규칙 1)
        left = norm_title("[전국] 2026년 예비창업패키지 1차 참여기업 모집 공고")
        right = norm_title("예비창업패키지 모집공고 (2차)")
        assert left == "예비창업패키지"
        assert right == "예비창업패키지"

    def test_norm_org_alias(self):
        assert norm_org("중기부") == "중소벤처기업부"
        assert norm_org("중소벤처기업부") == "중소벤처기업부"
        assert norm_org("  ") is None


class TestSimilarity:
    def test_identical_is_one(self):
        assert trigram_similarity("예비창업패키지", "예비창업패키지") == 1.0

    def test_disjoint_is_zero(self):
        assert trigram_similarity("예비창업패키지", "수출바우처") == 0.0

    def test_partial_overlap_between(self):
        score = trigram_similarity("예비창업패키지 창업자", "예비창업패키지")
        assert 0.0 < score < 1.0


class TestGrouping:
    def test_same_announcement_across_sources_merges(self):
        """AC-006: 제목 유사 + 기관 동일 + 마감 동일 → 한 그룹, canonical은 K-Startup 1건."""
        kstartup_row = record(1, "k-startup", "2026년 예비창업패키지 창업자 모집 공고")
        ontong_row = record(2, "ontong-youth", "[전국] 예비창업패키지 창업자 모집")
        assignments = by_id(engine.build_assignments([kstartup_row, ontong_row], TODAY))
        assert assignments[1].group_id == assignments[2].group_id == 1
        assert assignments[1].canonical is True
        assert assignments[2].canonical is False

    def test_similar_but_different_not_merged(self):
        """AC-008: 비슷하지만 다른 공고(스코어 < 0.85)는 합치지 않는다."""
        left = record(1, "k-startup", "청년창업사관학교 입교생 모집", organization="중소벤처기업부")
        right = record(2, "ontong-youth", "청년창업 임차료 지원사업", organization="고령군")
        assignments = by_id(engine.build_assignments([left, right], TODAY))
        assert assignments[1].group_id is None
        assert assignments[2].group_id is None

    def test_different_deadline_blocked_apart(self):
        """블로킹: 마감일이 다르면 제목이 같아도 신규 병합 대상이 아니다."""
        left = record(1, "k-startup", "예비창업패키지 모집")
        right = record(2, "ontong-youth", "예비창업패키지 모집", deadline=date(2026, 7, 15))
        assignments = by_id(engine.build_assignments([left, right], TODAY))
        assert assignments[1].group_id is None
        assert assignments[2].group_id is None

    def test_dateless_records_stay_single(self):
        left = record(1, "k-startup", "상시 입주기업 모집", deadline=None, always_open=True)
        right = record(2, "ontong-youth", "상시 입주기업 모집", deadline=None, always_open=True)
        assignments = by_id(engine.build_assignments([left, right], TODAY))
        assert assignments[1].group_id is None
        assert assignments[2].group_id is None

    def test_same_series_different_track_not_merged(self):
        """튜닝 회귀(2026-06-12 라이브 표본): 분야·지역·파트너 한 단어 차이는 다른 공고다."""
        observed_false_merges = [
            ("초격차 스타트업 프로젝트 모두의 챌린지 플랫폼 참여기업 모집공고",
             "초격차 스타트업 프로젝트 모두의 챌린지 뷰티 참여기업 모집공고"),
            ("2026 예술산업 금융지원 시범사업 지역설명회 (부산)",
             "2026 예술산업 금융지원 시범사업 지역설명회 (광주)"),
            ("Dream Venture Star with 호반그룹 드림벤처스타 12기 지원사업 모집공고",
             "Dream Venture Star with SK텔레콤 드림벤처스타 12기 지원사업 모집공고"),
            ("2026년 중동(아마존) 온라인 시장 진출 지원사업 참여기업 모집",
             "2026년 북미(아마존) 온라인 시장 진출 지원사업 참여기업 모집"),
            # 마감일이 같은 1차/2차 — AC-008이 명시한 차수 오합치 (라이브 표본 11829)
            ("[KOTRA] 혁신기업 글로벌오픈이노베이션 5월 사업 신청 안내 - 2차",
             "[KOTRA] 혁신기업 글로벌오픈이노베이션 사업 5월 1차 신청 안내"),
        ]
        for left_title, right_title in observed_false_merges:
            left = record(1, "k-startup", left_title)
            right = record(2, "k-startup", right_title)
            assignments = by_id(engine.build_assignments([left, right], TODAY))
            assert assignments[1].group_id is None, left_title
            assert assignments[2].group_id is None, right_title

    def test_revision_notice_still_merges(self):
        """무시 가능 토큰(수정·공고)만 다른 진짜 중복은 여전히 병합된다 — 라이브 교차 그룹 표본."""
        left = record(1, "k-startup", "2025년 창업도약패키지(투자병행형) 창업기업 모집 수정 공고")
        right = record(2, "ontong-youth", "창업도약패키지(투자병행형) 창업기업 모집")
        assignments = by_id(engine.build_assignments([left, right], TODAY))
        assert assignments[1].group_id == assignments[2].group_id == 1
        assert assignments[1].canonical is True


class TestCanonical:
    def test_closed_canonical_promotes_open_member(self):
        """AC-010: 기존 그룹에서 K-Startup이 마감되면 진행 중 레코드가 canonical로 승격된다."""
        closed_kstartup = record(
            1, "k-startup", "예비창업패키지 모집", deadline=date(2026, 6, 1), group_id=1)
        open_ontong = record(
            2, "ontong-youth", "예비창업패키지 모집", deadline=date(2026, 8, 31), group_id=1)
        assignments = by_id(engine.build_assignments([closed_kstartup, open_ontong], TODAY))
        assert assignments[1].group_id == assignments[2].group_id == 1  # 그룹 보존(비파괴)
        assert assignments[1].canonical is False
        assert assignments[2].canonical is True

    def test_no_kstartup_group_prefers_info_count(self):
        """§6-D: 그룹에 K-Startup이 없으면 정보량 많은 쪽이 canonical."""
        rich = record(1, "ontong-youth", "창업 공간 입주 모집", info_count=12)
        poor = record(2, "bizinfo", "창업 공간 입주 모집", info_count=4)
        assignments = by_id(engine.build_assignments([rich, poor], TODAY))
        assert assignments[1].canonical is True
        assert assignments[2].canonical is False

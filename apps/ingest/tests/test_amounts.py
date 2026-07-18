"""지원금 규모 추출 테스트 — AC-028(정확 추출)·AC-029(오인 금지) / data-model §6-E."""
from ingest.normalize.amounts import extract_amounts


class TestExactExtraction:
    def test_per_company_and_total_split(self):
        # AC-028 대표 케이스
        result = extract_amounts("기업당 최대 1.5억원 지원 (총 사업비 100억원)")
        assert result.max_support_amount == 150_000_000
        assert result.total_program_budget == 10_000_000_000
        assert "1.5억원" in result.source_text

    def test_live_samples(self):
        # 라이브 표본(2026-07-18) 재현
        assert extract_amounts("사업화 자금(최대 1.4억원) 및 후속 연계 지원").max_support_amount == 140_000_000
        assert extract_amounts("창업지원금 지원(1인당 최대 2천만 원)").max_support_amount == 20_000_000

    def test_total_postfix_form(self):
        # 후위형 "총 X원 규모" (§6-E — Codex): 규모가 붙으면 사업 예산 표현으로 확실
        result = extract_amounts("총 100억원 규모로 지원")
        assert result.total_program_budget == 10_000_000_000
        assert result.max_support_amount is None

    def test_bare_total_not_extracted(self):
        # 전수 검수(2026-07-18): bare '총'은 개인 수령 총액("월 20만원 한도, 총 60만원")을
        # 사업 예산으로 오분류 → 명시 표현(총 사업비·총 예산)만 인정. 재원형 bare 총도 놓침 허용
        assert extract_amounts("월 20만원 한도, 총 60만원 이내").total_program_budget is None
        assert extract_amounts("성과공유회 및 운영사의 직접투자 검토(총 2억원)").total_program_budget is None

    def test_multiple_tracks_take_maximum(self):
        # 트랙이 여럿이면 "적용 가능한 최대"가 답 (FR-008)
        result = extract_amounts("일반트랙 최대 8억원, 딥테크 트랙 최대 15억원 지원")
        assert result.max_support_amount == 1_500_000_000
        assert "15억원" in result.source_text

    def test_decimal_exactness(self):
        # float 오차 방어(Codex 6차) — 0.29억이 28,999,999가 되면 안 된다
        assert extract_amounts("최대 0.29억원").max_support_amount == 29_000_000
        assert extract_amounts("최대 1.15억원").max_support_amount == 115_000_000

    def test_unit_combinations(self):
        assert extract_amounts("팀당 1억 5천만원").max_support_amount == 150_000_000
        assert extract_amounts("과제당 5,000만원").max_support_amount == 50_000_000
        assert extract_amounts("최대 700백만원 지원").max_support_amount == 700_000_000

    def test_range_takes_upper_bound(self):
        # §6-E 규칙 5: 범위는 상한 — 하한에 원이 붙은 흔한 표기도 (Codex 3차)
        assert extract_amounts("기업당 5천만~1억원 지원").max_support_amount == 100_000_000
        assert extract_amounts("기업당 5천만원~1억원 지원").max_support_amount == 100_000_000
        assert extract_amounts("기업당 5,000만원 ~ 1억원 지원").max_support_amount == 100_000_000
        # 복합 단위 하한(Codex 4차) — 조각 하나만 지우면 잔여가 상한에 합산돼 2억이 3억이 된다
        assert extract_amounts("기업당 1억 5천만원~2억원 지원").max_support_amount == 200_000_000

    def test_won_suffix_omitted(self):
        # 원 생략형 (Codex 3차) — 억·천만·백만 단위로 끝나면 금액이 확실
        assert extract_amounts("기업당 최대 1.5억 지원").max_support_amount == 150_000_000
        assert extract_amounts("총 사업비 100억").total_program_budget == 10_000_000_000
        assert extract_amounts("팀당 5천만 지원").max_support_amount == 50_000_000
        # bare '만'은 수량("10만 명") 오인 위험 — 원 없이는 금액으로 안 본다
        assert extract_amounts("최대 10만 명 대상 프로그램").max_support_amount is None

    def test_total_with_max_inside(self):
        # "총 사업비 최대 100억" — 총액이며, 기업당으로 중복 추출되지 않는다
        result = extract_amounts("총 사업비 최대 100억원")
        assert result.total_program_budget == 10_000_000_000
        assert result.max_support_amount is None


class TestFalsePositiveGuards:
    def test_eligibility_amounts_not_extracted(self):
        # AC-029: 자격 조건 금액은 지원금이 아니다
        assert extract_amounts("연 매출액이 5천만원 이하인 업체").max_support_amount is None
        assert extract_amounts("최대 10억원 이하 매출 기업 대상").max_support_amount is None
        assert extract_amounts("투자기관으로부터 1천만원 이상 투자를 받은 기업").max_support_amount is None

    def test_loan_guarantee_amounts_not_extracted(self):
        # 융자·보증 한도는 성격이 다름 (§6-E 규칙 4)
        assert extract_amounts("(보증한도) 업체당 5천만원 이내").max_support_amount is None
        assert extract_amounts("융자 최대 20억원").max_support_amount is None

    def test_loan_document_guard(self):
        # 전수 검수(2026-07-18): 창 기반 배제를 빠져나간 실사례 — 융자성 단어가 문서 어디든 있으면 통째 제외
        assert extract_amounts("업체당 최대 50백만원\n○ 상환방법\n- 1년 일시상환").max_support_amount is None
        assert extract_amounts("후계농업경영인 육성자금: 세대당 최대 5억원 대출 지원").max_support_amount is None
        # '보증금'(임대차 용어)은 융자 가드에 안 걸린다
        assert extract_amounts("최대 300만원 지원 ※ 관리비, 보증금 등 제외").max_support_amount == 3_000_000

    def test_per_company_upper_bound(self):
        # 전수 검수(2026-07-18): "4~5기 4년간 최대 80억원"은 사업단 예산 — 기업당 상한 20억으로 차단
        assert extract_amounts("4~5기 4년간 최대 80억원, 6기 최대 45억원 이내 지원").max_support_amount is None
        assert extract_amounts("딥테크 트랙 최대 15억원").max_support_amount == 1_500_000_000

    def test_multi_year_program_budget_not_extracted(self):
        # 전수 검수(2026-07-18): "N년간 최대 X원"은 프로그램 다년 예산 — 상한(20억) 이하라도 제외
        assert extract_amounts("(단위형) 3년간 최대 15억원 이내 지원").max_support_amount is None
        assert extract_amounts("2개년 최대 5억원 지원").max_support_amount is None

    def test_loan_category_skipped_entirely(self):
        assert extract_amounts("기업당 최대 1억원", category="융자ㆍ보증").max_support_amount is None

    def test_bare_amount_without_modifier_ignored(self):
        # 수식어 없는 금액은 후보 자체가 아님 — 정밀도 우선
        assert extract_amounts("사업비 3억원 규모의 프로그램").max_support_amount is None

    def test_out_of_bounds_dropped(self):
        # 오파싱 방어: 10만원 미만·1조 초과
        assert extract_amounts("최대 50,000원 지원").max_support_amount is None
        assert extract_amounts("최대 15,000억원").max_support_amount is None  # 1.5조 — 상한 초과


class TestNullSafety:
    def test_none_and_empty(self):
        assert extract_amounts(None).max_support_amount is None
        assert extract_amounts("").source_text is None

    def test_no_amount_text(self):
        result = extract_amounts("예비창업자를 위한 멘토링 프로그램")
        assert result.max_support_amount is None
        assert result.total_program_budget is None
        assert result.source_text is None

    def test_deterministic(self):
        text = "기업당 최대 1.5억원 지원 (총 사업비 100억원)"
        assert extract_amounts(text) == extract_amounts(text)

"""정규화 단위 테스트 — data-model.md §6 규칙 2·4·5·11 / §7 표준 분류."""
from datetime import date

from ingest.normalize import (
    clean_text,
    clean_url,
    mentions_always_open,
    normalize_audiences,
    normalize_category,
    normalize_ontong_category,
    normalize_organization_type,
    normalize_region,
    normalize_stages,
    parse_yyyymmdd,
    sido_from_zip_codes,
    split_date_range,
)


class TestCleanText:
    def test_html_entity_unescape(self):
        assert clean_text("기술개발(R&amp;D)") == "기술개발(R&D)"
        assert clean_text("서울 AI 허브 &#40;본관&#41;") == "서울 AI 허브 (본관)"

    def test_strip_and_crlf(self):
        assert clean_text("  공고문\r\n끝에 줄바꿈\r\n  ") == "공고문\n끝에 줄바꿈"

    def test_empty_becomes_none(self):
        assert clean_text(None) is None
        assert clean_text("   ") is None


class TestParseYyyymmdd:
    def test_live_format(self):
        assert parse_yyyymmdd("20260619") == date(2026, 6, 19)
        assert parse_yyyymmdd(20260619) == date(2026, 6, 19)

    def test_malformed_returns_none(self):
        assert parse_yyyymmdd("2026-06-19") is None
        assert parse_yyyymmdd("") is None
        assert parse_yyyymmdd(None) is None
        assert parse_yyyymmdd("20261341") is None  # 13월 41일


class TestCleanUrl:
    def test_markdown_wrapped(self):
        assert (
            clean_url("[www.k-startup.go.kr](https://www.k-startup.go.kr/apply/1)")
            == "https://www.k-startup.go.kr/apply/1"
        )

    def test_scheme_fix(self):
        assert clean_url("www.bizinfo.go.kr/view/1") == "https://www.bizinfo.go.kr/view/1"

    def test_non_url_text_returns_none(self):
        assert clean_url("방문 접수 후 담당자 안내에 따름") is None
        assert clean_url(None) is None
        assert clean_url("  ") is None


class TestCategory:
    def test_standard_with_entity_and_separator(self):
        unknown = []
        assert normalize_category("기술개발(R&amp;D)", unknown) == "기술개발(R&D)"
        # U+00B7(·) 표기도 표준 라벨(U+318D ㆍ)로 흡수 (§7)
        assert normalize_category("판로·해외진출", unknown) == "판로ㆍ해외진출"
        assert unknown == []

    def test_unknown_maps_to_gita_and_logs(self):
        unknown = []
        assert normalize_category("수출 지원", unknown) == "기타"
        assert unknown == ["category:수출 지원"]

    def test_missing_is_null(self):
        assert normalize_category(None, []) is None
        assert normalize_category("", []) is None


class TestRegion:
    def test_short_and_full_name(self):
        assert normalize_region("서울", []) == "서울"
        assert normalize_region("대전광역시", []) == "대전"
        assert normalize_region("전북특별자치도", []) == "전북"

    def test_unknown_logged_and_dropped(self):
        unknown = []
        assert normalize_region("수도권", unknown) is None
        assert unknown == ["region:수도권"]


class TestTargets:
    def test_stage_tokens(self):
        assert normalize_stages("예비창업자,1년미만", []) == ["PRE_STARTUP", "LT_1Y"]

    def test_audience_tokens_with_space(self):
        assert normalize_audiences("대학생,1인 창조기업", []) == ["UNIV_STUDENT", "SOLO_CREATOR"]

    def test_unknown_token_logged_others_kept(self):
        unknown = []
        assert normalize_stages("예비창업자,15년미만", unknown) == ["PRE_STARTUP"]
        assert unknown == ["target_startup_stage:15년미만"]

    def test_no_signal_is_null(self):
        assert normalize_stages(None, []) is None
        assert normalize_audiences("", []) is None


class TestOrganizationType:
    def test_known(self):
        assert normalize_organization_type("공공기관", []) == "PUBLIC"

    def test_unknown_logged(self):
        unknown = []
        assert normalize_organization_type("지자체", unknown) is None
        assert unknown == ["organization_type:지자체"]


class TestSplitDateRange:
    def test_live_format(self):
        assert split_date_range("20260518 ~ 20260616") == (date(2026, 5, 18), date(2026, 6, 16))

    def test_malformed_or_blank(self):
        assert split_date_range("") == (None, None)
        assert split_date_range(None) == (None, None)
        assert split_date_range("20260518") == (None, None)  # "~" 누락 방어 (§6-B 규칙 2 준용)

    def test_one_side_invalid_kept_partial(self):
        assert split_date_range(" ~ 20261231") == (None, date(2026, 12, 31))


class TestMentionsAlwaysOpen:
    def test_recurring_keywords(self):
        assert mentions_always_open("연중") is True
        assert mentions_always_open("계속사업") is True
        assert mentions_always_open("매년 연말 연초 정기 모집") is True
        assert mentions_always_open("연례반복") is True

    def test_non_recurring_or_blank(self):
        assert mentions_always_open("미정") is False
        assert mentions_always_open("2025.1.~12.") is False
        assert mentions_always_open("협약시작일로부터 10개월 내외") is False
        assert mentions_always_open(None) is False


class TestSidoFromZipCodes:
    def test_single_sigungu_code(self):
        assert sido_from_zip_codes("47830", []) == "경북"

    def test_multiple_codes_same_sido(self):
        assert sido_from_zip_codes("47830,47840", []) == "경북"

    def test_multiple_sido_deferred(self):
        assert sido_from_zip_codes("11000,26000", []) is None  # 단일 컬럼 — 보류, raw 보존

    def test_unknown_prefix_logged(self):
        unknown = []
        assert sido_from_zip_codes("99999", unknown) is None
        assert unknown == ["region_zip:99999"]


class TestOntongCategory:
    def test_startup_maps_to_commercialization(self):
        assert normalize_ontong_category("창업", "청년창업 지원사업", []) == "사업화"

    def test_facility_keyword_in_title_overrides(self):
        assert normalize_ontong_category("창업", "창업보육센터 입주기업 모집", []) == "시설ㆍ공간ㆍ보육"
        assert normalize_ontong_category("창업", "청년 창업공간 무상 제공", []) == "시설ㆍ공간ㆍ보육"

    def test_loan_subsidy_title_not_facility(self):
        # "임차료 지원"은 자금 지원이지 공간 대여가 아니다 — 오분류 방지 (정밀도 우선)
        assert normalize_ontong_category("창업", "청년창업자 임차료 지원사업", []) == "사업화"

    def test_unknown_maps_to_gita_and_logs(self):
        unknown = []
        assert normalize_ontong_category("주거", "일반 정책", unknown) == "기타"
        assert unknown == ["category:주거"]

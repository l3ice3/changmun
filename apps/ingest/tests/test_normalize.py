"""정규화 단위 테스트 — data-model.md §6 규칙 2·4·5·11 / §7 표준 분류."""
from datetime import date

from ingest.normalize import (
    clean_text,
    clean_url,
    mentions_always_open,
    normalize_audiences,
    normalize_category,
    normalize_ontong_category,
    normalize_regions,
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

    def test_separator_formats(self):
        # 기업마당 라이브는 대시 형식으로 옴 (§6-B 명세 YYYYMMDD와 다름 — 라이브 검증)
        assert parse_yyyymmdd("2026-06-19") == date(2026, 6, 19)
        assert parse_yyyymmdd("2026.06.19") == date(2026, 6, 19)

    def test_malformed_returns_none(self):
        assert parse_yyyymmdd("2026-6-19") is None  # 자리수 부족 — 8자리 아님
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
        assert normalize_regions("서울", []) == ["서울"]
        assert normalize_regions("대전광역시", []) == ["대전"]
        assert normalize_regions("전북특별자치도", []) == ["전북"]

    def test_multiple_regions(self):
        assert normalize_regions("서울,경기", []) == ["서울", "경기"]
        assert normalize_regions("서울,서울특별시", []) == ["서울"]  # 중복 제거

    def test_jeonnamgwangju_merger(self):
        # 2026 행정구역 통합(§7): 광주·전남·신구 표기 전부 → 전남광주 단일 표준값
        assert normalize_regions("광주", []) == ["전남광주"]
        assert normalize_regions("전남", []) == ["전남광주"]
        assert normalize_regions("광주광역시", []) == ["전남광주"]
        assert normalize_regions("전라남도", []) == ["전남광주"]
        assert normalize_regions("전남광주통합특별시", []) == ["전남광주"]
        assert normalize_regions("광주,전남", []) == ["전남광주"]  # 구표기 복수 → 중복 제거

    def test_unknown_logged_and_dropped(self):
        unknown = []
        assert normalize_regions("수도권", unknown) is None
        assert unknown == ["region:수도권"]

    def test_partial_unknown_keeps_recognized(self):
        unknown = []
        assert normalize_regions("서울,수도권", unknown) == ["서울"]
        assert unknown == ["region:수도권"]


class TestTargets:
    def test_stage_tokens(self):
        assert normalize_stages("예비창업자,1년미만", []) == ["PRE_STARTUP", "LT_1Y"]

    def test_stage_4y_6y_added(self):
        # 라이브 biz_enyy에서 관찰된 4·6년미만 (data-model §7 확장, 2026-06-18)
        assert normalize_stages("4년미만,6년미만", []) == ["LT_4Y", "LT_6Y"]

    def test_audience_tokens_with_space(self):
        assert normalize_audiences("대학생,1인 창조기업", []) == ["UNIV_STUDENT", "SOLO_CREATOR"]

    def test_unknown_token_logged_others_kept(self):
        unknown = []
        assert normalize_stages("예비창업자,15년미만", unknown) == ["PRE_STARTUP"]
        assert unknown == ["target_startup_stage:15년미만"]

    def test_no_signal_is_null(self):
        assert normalize_stages(None, []) is None
        assert normalize_audiences("", []) is None


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
        assert sido_from_zip_codes("47830", []) == ["경북"]

    def test_multiple_codes_same_sido(self):
        assert sido_from_zip_codes("47830,47840", []) == ["경북"]

    def test_multiple_sido_array(self):
        # region이 배열이라 복수 시도를 모두 보존(정렬)
        assert sido_from_zip_codes("11000,26000", []) == ["부산", "서울"]

    def test_jeonnamgwangju_zip_prefixes(self):
        # 신규 12(라이브 실증: 목포 12110·강진 12780)와 구 광주 29·전남 46 전부 → 전남광주
        assert sido_from_zip_codes("12110", []) == ["전남광주"]
        assert sido_from_zip_codes("29000,46000", []) == ["전남광주"]

    def test_unknown_prefix_logged(self):
        unknown = []
        assert sido_from_zip_codes("99999", unknown) is None
        assert unknown == ["region_zip:99999"]

    def test_partial_unknown_keeps_recognized(self):
        # 인식+미분류 혼재 → 인식된 시도는 배열로 보존, 미지 코드는 로그
        unknown = []
        assert sido_from_zip_codes("47830,99999", unknown) == ["경북"]
        assert "region_zip:99999" in unknown


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

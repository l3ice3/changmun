"""기업마당 RSS 매핑·범위·페이지네이션 테스트 — AC-001·003·004·005."""
from datetime import date

import pytest

from ingest.errors import SourceError
from ingest.sources import bizinfo


# 라이브 RSS 응답 표본 기반 — 키는 소문자 hashtags, 날짜는 대시 형식 (라이브 검증 2026-07)
SAMPLE = {
    "pblancId": "PBLN_0001",
    "pblancNm": "지역 창업기업 모집",
    "bsnsSumryCn": "<div>창업기업을 <b>지원</b>합니다.</div>",
    "pldirSportRealmLclasCodeNm": "창업",
    "hashtags": "창업,서울,경기,2026,중소벤처기업부,멘토링",
    "jrsdInsttNm": "중소벤처기업부",
    "trgetNm": "예비창업자 및 창업기업",
    "reqstBeginEndDe": "2026-07-01 ~ 2026-07-31",
    "pblancUrl": "https://www.bizinfo.go.kr/detail/1",
    "rceptEngnHmpgUrl": "https://apply.example.com/1",
}


class FakeResponse:
    def __init__(self, text: str, status_code: int = 200):
        self.text = text
        self.status_code = status_code


def _rss(page: int, count: int, total: int) -> str:
    items = "".join(
        f"<item><pblancId>PBLN_{page}_{index}</pblancId><pblancNm>공고</pblancNm>"
        "<lcategory>창업</lcategory><link>https://example.com</link></item>"
        for index in range(count)
    )
    return f"<rss><channel><totCnt>{total}</totCnt>{items}</channel></rss>"


def test_full_mapping_and_raw_preserved():
    result = bizinfo.map_record(SAMPLE)
    record = result.record
    assert result.skip_reason is None
    assert record.source == "bizinfo"
    assert record.external_id == "PBLN_0001"
    assert record.summary == "창업기업을 지원 합니다."
    assert record.category == "사업화"
    assert record.region == ["서울", "경기"]
    assert record.application_start_date == date(2026, 7, 1)
    assert record.application_deadline == date(2026, 7, 31)
    assert record.target_startup_stage is None
    assert record.raw == SAMPLE


def test_spec_format_also_accepted():
    """명세(§6-B) 표기 형식(hashTags 카멜케이스·YYYYMMDD)도 폴백으로 처리한다."""
    item = dict(SAMPLE, reqstBeginEndDe="20260701 ~ 20260731")
    del item["hashtags"]
    item["hashTags"] = "2026, 창업, 서울, 경기, 중소벤처기업부"
    record = bizinfo.map_record(item).record
    assert record.region == ["서울", "경기"]
    assert record.application_start_date == date(2026, 7, 1)
    assert record.application_deadline == date(2026, 7, 31)


def test_all_sido_listing_gains_nationwide_label():
    """시도 전체 나열(전국 사업 표현) → '전국' 라벨 부여 + 개별 시도 보존 (region=전국 필터 @> 매칭)."""
    item = dict(
        SAMPLE,
        hashtags="창업,서울,부산,대구,인천,광주,대전,울산,세종,경기,강원,충북,충남,전북,전남,경북,경남,제주,2026",
    )
    record = bizinfo.map_record(item).record
    assert record.region[0] == "전국"
    assert set(record.region) == {
        "전국", "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
        "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
    }


def test_partial_sido_listing_keeps_regions_only():
    """일부 시도만 나열(비수도권 사업 등)은 '전국'을 부여하지 않는다 — 억지 채움 금지.

    "전남광주"(통합특별시 표기)는 이 표준(17개 시도)에 없어 제외 — 시도 전체가 안 채워져
    전국 부여도 안 된다. 통합 표준 개정(feat/region-jeonnamgwangju)이 이 갭을 닫는다.
    """
    item = dict(
        SAMPLE,
        hashtags="창업,서울,부산,대구,인천,전남광주,대전,울산,세종,경기,강원,충북,충남,전북,경북,경남,제주,2026",
    )
    record = bizinfo.map_record(item).record
    assert "전국" not in record.region
    assert record.region == [
        "서울", "부산", "대구", "인천", "대전", "울산", "세종",
        "경기", "강원", "충북", "충남", "전북", "경북", "경남", "제주",
    ]


def test_reqst_dt_fallback_for_dates():
    """확장 필드(reqstBeginEndDe) 없이 RSS 기본 필드(reqstDt)만 와도 신청기간을 채운다."""
    item = dict(SAMPLE, reqstDt="2026-07-01 ~ 2026-07-31")
    del item["reqstBeginEndDe"]
    record = bizinfo.map_record(item).record
    assert record.application_start_date == date(2026, 7, 1)
    assert record.application_deadline == date(2026, 7, 31)


def test_missing_required_field_is_skipped():
    result = bizinfo.map_record({"pblancNm": "제목", "lcategory": "창업"})
    assert result.record is None
    assert "필수필드 누락" in result.skip_reason


def test_non_startup_slice_is_skipped():
    item = dict(SAMPLE, pldirSportRealmLclasCodeNm="금융")
    result = bizinfo.map_record(item)
    assert result.record is None
    assert "창업 슬라이스 아님" in result.skip_reason


def test_paginates_and_sends_fixed_scope():
    calls = []

    def fake_get(url, params, timeout):
        calls.append(params)
        count = 100 if params["pageIndex"] == 1 else 50
        return FakeResponse(_rss(params["pageIndex"], count, 150))

    pages = list(bizinfo.fetch_pages("KEY", http_get=fake_get, sleep=lambda _: None))
    assert [len(page) for page in pages] == [100, 50]
    assert [call["pageIndex"] for call in calls] == [1, 2]
    assert calls[0]["searchLclasId"] == "06"
    assert calls[0]["dataType"] == "rss"
    assert calls[0]["crtfcKey"] == "KEY"


def test_error_envelope_raises_source_error():
    """인증 오류는 HTTP 200 + XML 오류 봉투로 옴 — 성공(0건) 리포트로 오인하면 안 됨 (AC-004)."""
    envelope = (
        "<OpenAPI_ServiceResponse><cmmMsgHeader>"
        "<returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg>"
        "</cmmMsgHeader></OpenAPI_ServiceResponse>"
    )

    def fake_get(url, params, timeout):
        return FakeResponse(envelope)

    with pytest.raises(SourceError):
        list(bizinfo.fetch_pages("BAD_KEY", http_get=fake_get, sleep=lambda _: None))


def test_genuinely_empty_feed_is_not_an_error():
    """totCnt=0이 명시된 빈 채널은 정상 0건 — 오류 봉투와 구분한다."""
    def fake_get(url, params, timeout):
        return FakeResponse("<rss><channel><totCnt>0</totCnt></channel></rss>")

    pages = list(bizinfo.fetch_pages("KEY", http_get=fake_get, sleep=lambda _: None))
    assert pages == [[]]

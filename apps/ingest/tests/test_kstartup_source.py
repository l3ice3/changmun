"""K-Startup 매핑·페이지네이션·재시도 테스트 — AC-003(스킵)·AC-005(미지 enum) 포함."""
import json
from datetime import date
from pathlib import Path

import pytest

from ingest.errors import SourceError
from ingest.sources import kstartup

FIXTURE = json.loads(
    (Path(__file__).parent / "fixtures" / "kstartup_page.json").read_text(encoding="utf-8")
)


def fixture_record(index: int) -> dict:
    return FIXTURE["data"][index]


class TestMapRecordHappy:
    def test_full_mapping(self):
        result = kstartup.map_record(fixture_record(0))
        record = result.record
        assert result.skip_reason is None
        assert record.source == "k-startup"
        assert record.external_id == "177976"  # number → str (§6 규칙 3)
        assert record.title == "2026 하반기 서울 AI 허브 입주기업 모집 공고"  # strip (§6 규칙 5)
        assert record.category == "기술개발(R&D)"  # &amp; 디코딩 (§6 규칙 4)
        assert record.region == ["서울"]
        assert record.organization == "서울특별시"
        assert record.organization_type == "공공기관"  # 원문 그대로(표시용)
        assert record.target_startup_stage == ["PRE_STARTUP", "LT_1Y"]  # 직접 신호 INSERT 저장 (#11)
        assert record.target_audience_type == ["YOUTH", "UNIV_STUDENT", "GENERAL", "SOLO_CREATOR"]
        assert record.application_start_date == date(2026, 6, 1)
        assert record.application_deadline == date(2026, 6, 19)
        assert record.is_always_open is False
        assert record.source_status == "Y"
        assert result.unknown_values == []

    def test_apply_url_fallback_markdown(self):
        # biz_aply_url null → 마크다운 래핑된 온라인 접수 URL 사용 (§6 규칙 11·12)
        record = kstartup.map_record(fixture_record(0)).record
        assert record.apply_url == "https://www.k-startup.go.kr/apply/177976"

    def test_raw_preserved_verbatim(self):
        original = fixture_record(0)
        record = kstartup.map_record(original).record
        assert record.raw == original  # 원본 그대로 — 가공 저장 금지


class TestDirectTargets:
    """직접 신호는 map_record가 아니라 direct_targets가 raw에서 산출한다 (#11)."""

    def test_direct_signals_from_raw(self):
        stages, audiences = kstartup.direct_targets(fixture_record(0), [])
        assert stages == ["PRE_STARTUP", "LT_1Y"]
        assert audiences == ["YOUTH", "UNIV_STUDENT", "GENERAL", "SOLO_CREATOR"]

    def test_no_signal_returns_none(self):
        stages, audiences = kstartup.direct_targets(fixture_record(3), [])
        assert stages is None
        assert audiences is None

    def test_unknown_token_logged(self):
        # 직접 단계도 미지 토큰을 unknown에 남긴다 (AC-005 회귀 방지)
        item = dict(fixture_record(0))
        item["biz_enyy"] = "예비창업자,15년미만"
        unknown = []
        stages, _ = kstartup.direct_targets(item, unknown)
        assert stages == ["PRE_STARTUP"]
        assert any("15년미만" in entry for entry in unknown)


class TestMapRecordSkip:
    """AC-003: 필수필드 누락 레코드는 스킵된다."""

    def test_missing_pbanc_sn(self):
        result = kstartup.map_record(fixture_record(1))
        assert result.record is None
        assert "필수필드 누락" in result.skip_reason

    def test_blank_title(self):
        result = kstartup.map_record(fixture_record(2))
        assert result.record is None
        assert "필수필드 누락" in result.skip_reason


class TestMapRecordEdges:
    """AC-005: 미지 enum → '기타' + 원본 로그. 날짜 이탈 → NULL."""

    def test_unknown_enums_and_malformed_dates(self):
        result = kstartup.map_record(fixture_record(3))
        record = result.record
        assert record.category == "기타"
        assert "category:수출 지원" in result.unknown_values
        assert record.organization_type == "지자체"  # 원문 보존(표시용 — 코드 매핑 폐기, 미지 NULL 아님)
        assert record.region == ["대전"]  # 풀네임 → 시도
        # "2026-06-30" — 구분자(-·.) 허용 파싱으로 인식 (기업마당 라이브 형식 대응하며 개선.
        # 예전엔 형식 이탈→None이라 실제 마감이 UNDATED로 오표시됐다)
        assert record.application_start_date == date(2026, 6, 30)
        assert record.application_deadline is None  # 빈값
        assert record.target_startup_stage is None  # 신호 없음 → NULL (억지 채움 금지)
        assert record.detail_url.startswith("https://")  # 스킴 보정
        assert record.apply_url is None  # 안내 문구는 URL 아님


class FakeResponse:
    def __init__(self, payload=None, status_code=200, text=""):
        self.status_code = status_code
        self.text = text
        self._payload = payload

    def json(self):
        if self._payload is None:
            raise ValueError("not json")
        return self._payload


def page_payload(page: int, per_page: int, total: int, count: int) -> dict:
    item = dict(fixture_record(0))
    return {"data": [item] * count, "totalCount": total, "page": page, "perPage": per_page}


class TestFetchPages:
    def test_paginates_until_total_count(self):
        calls = []

        def fake_get(url, params, timeout):
            calls.append(params)
            return FakeResponse(page_payload(params["page"], 100, 150, 100 if params["page"] == 1 else 50))

        pages = list(kstartup.fetch_pages("KEY", http_get=fake_get, sleep=lambda _: None))
        assert len(pages) == 2
        assert [c["page"] for c in calls] == [1, 2]
        assert calls[0]["serviceKey"] == "KEY"
        assert calls[0]["returnType"] == "json"

    def test_retry_then_success(self):
        attempts = []

        def flaky_get(url, params, timeout):
            attempts.append(1)
            if len(attempts) < 3:
                return FakeResponse(status_code=500, text="oops")
            return FakeResponse(page_payload(1, 100, 1, 1))

        pages = list(kstartup.fetch_pages("KEY", http_get=flaky_get, sleep=lambda _: None))
        assert len(pages) == 1
        assert len(attempts) == 3

    def test_retries_exhausted_raises_source_error(self):
        def broken_get(url, params, timeout):
            return FakeResponse(status_code=200, text="<OpenAPI_ServiceResponse>인증키 오류</OpenAPI_ServiceResponse>")

        with pytest.raises(SourceError, match="JSON 파싱 실패"):
            list(kstartup.fetch_pages("BAD", http_get=broken_get, sleep=lambda _: None))

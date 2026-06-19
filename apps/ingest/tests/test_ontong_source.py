"""온통청년 매핑·페이지네이션 테스트 — fixture는 실제 API 응답 봉투 그대로 (2026-06-12 수집)."""
import json
from datetime import date
from pathlib import Path

from ingest.sources import ontong_youth

FIXTURE = json.loads(
    (Path(__file__).parent / "fixtures" / "ontong_page.json").read_text(encoding="utf-8")
)
REAL_ITEMS = FIXTURE["result"]["youthPolicyList"]


def real_item() -> dict:
    return dict(REAL_ITEMS[0])


class TestMapRecordHappy:
    def test_full_mapping(self):
        result = ontong_youth.map_record(real_item())
        record = result.record
        assert result.skip_reason is None
        assert record.source == "ontong-youth"
        assert record.external_id == "20260527005400213221"  # plcyNo 20자리 (§6-C)
        assert record.title == "2026년 청년창업자 임차료 지원사업"
        assert record.category == "사업화"  # mclsfNm 창업 → 느슨 매핑 (§7)
        assert record.region == "경북"  # zipCd 47830 → 시도 (§6-C 규칙 2)
        assert record.organization == "경상북도 고령군 인구정책실"
        assert record.application_start_date == date(2026, 5, 18)  # aplyYmd 분리 (§6-C 규칙 3)
        assert record.application_deadline == date(2026, 6, 16)
        assert record.is_always_open is False
        assert record.source_status == "0057001"
        assert result.unknown_values == []

    def test_summary_joins_explanation_and_support(self):
        record = ontong_youth.map_record(real_item()).record
        assert "임차료 50%" in record.summary
        assert "(목적)" in record.summary  # plcySprtCn 결합 (§6-C 표)

    def test_apply_url_falls_back_to_reference_url(self):
        record = ontong_youth.map_record(real_item()).record
        assert record.apply_url.startswith("https://www.goryeong.go.kr/")

    def test_detail_url_generated_from_plcy_no(self):
        record = ontong_youth.map_record(real_item()).record
        assert record.detail_url == (
            "https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch/ythPlcyDetail/"
            "20260527005400213221"
        )

    def test_raw_preserved_verbatim(self):
        original = real_item()
        record = ontong_youth.map_record(original).record
        assert record.raw == original


class TestEligibilityFallback:
    def test_falls_back_to_support_content_when_qualification_blank(self):
        # real_item: addAplyQlfcCndCn 빈값 → plcySprtCn으로 폴백 (§6-C)
        record = ontong_youth.map_record(real_item()).record
        assert record.eligibility_detail is not None
        assert "(목적)" in record.eligibility_detail

    def test_prefers_qualification_when_present(self):
        item = real_item()
        item["addAplyQlfcCndCn"] = "만 19~39세 미취업 청년"
        record = ontong_youth.map_record(item).record
        assert record.eligibility_detail == "만 19~39세 미취업 청년"


class TestPeriodResolution:
    """기간 폴백 체인 (data-model §6-C 보강): aplyYmd → 상시키워드 → 사업종료일 → 미상."""

    def test_apply_period_takes_priority(self):
        # aplyYmd 있으면 그대로 — bizPrd 신호보다 우선 (real_item: 20260518 ~ 20260616)
        record = ontong_youth.map_record(real_item()).record
        assert record.application_deadline == date(2026, 6, 16)
        assert record.is_always_open is False

    def test_recurring_keyword_marks_always_open(self):
        item = real_item()
        item["aplyYmd"] = ""
        item["bizPrdEtcCn"] = "연중"
        record = ontong_youth.map_record(item).record
        assert record.is_always_open is True
        assert record.application_deadline is None

    def test_business_end_date_fallback(self):
        item = real_item()
        item["aplyYmd"] = ""
        item["bizPrdEtcCn"] = ""
        item["bizPrdEndYmd"] = "20251231"  # 과거 → 조회 시 status 산식이 CLOSED로 계산
        record = ontong_youth.map_record(item).record
        assert record.is_always_open is False
        assert record.application_deadline == date(2025, 12, 31)

    def test_no_signal_stays_undated(self):
        item = real_item()
        item["aplyYmd"] = ""
        item["bizPrdEtcCn"] = "미정"  # 협약기반·미정·빈값은 추측하지 않음
        item["bizPrdEndYmd"] = ""
        record = ontong_youth.map_record(item).record
        assert record.is_always_open is False
        assert record.application_deadline is None


class TestDirectTargets:
    """직접 신호(YOUTH 유추)는 map_record가 아니라 direct_targets가 raw에서 산출한다 (#11)."""

    def test_map_record_stores_direct_signal(self):
        # 직접 신호는 INSERT 시 저장된다(신규 행 보존). 신호 있는 항목으로 확인 (#11)
        item = real_item()
        item["sprtTrgtAgeLmtYn"] = "Y"
        item["sprtTrgtMaxAge"] = "39"
        record = ontong_youth.map_record(item).record
        assert record.target_audience_type == ["YOUTH"]
        assert record.target_startup_stage is None  # 온통은 업력 신호 없음

    def test_explicit_youth_age_limit(self):
        item = real_item()
        item["sprtTrgtAgeLmtYn"] = "Y"
        item["sprtTrgtMaxAge"] = "39"
        stages, audiences = ontong_youth.direct_targets(item, [])
        assert audiences == ["YOUTH"]
        assert stages is None

    def test_no_age_limit_keeps_null(self):
        # 실데이터 1번 레코드: ageLmtYn=N → 신호 없음 → NULL (AC-009)
        stages, audiences = ontong_youth.direct_targets(real_item(), [])
        assert audiences is None
        assert stages is None

    def test_age_above_youth_range_keeps_null(self):
        item = real_item()
        item["sprtTrgtAgeLmtYn"] = "Y"
        item["sprtTrgtMaxAge"] = "45"
        _, audiences = ontong_youth.direct_targets(item, [])
        assert audiences is None


class TestSkipAndGuards:
    def test_missing_plcy_no_skipped(self):
        item = real_item()
        item["plcyNo"] = None
        result = ontong_youth.map_record(item)
        assert result.record is None
        assert "필수필드 누락" in result.skip_reason

    def test_non_startup_slice_skipped(self):
        item = real_item()
        item["mclsfNm"] = "주거"  # 서버 필터 이중 방어
        result = ontong_youth.map_record(item)
        assert result.record is None
        assert "창업 슬라이스 아님" in result.skip_reason

    def test_multi_sido_region_deferred(self):
        item = real_item()
        item["zipCd"] = "11000,26000"  # 서울+부산 → 단일 컬럼이라 보류
        record = ontong_youth.map_record(item).record
        assert record.region is None


class FakeResponse:
    def __init__(self, payload):
        self.status_code = 200
        self.text = ""
        self._payload = payload

    def json(self):
        return self._payload


def envelope(page: int, per_page: int, total: int, count: int) -> dict:
    return {
        "resultCode": 200,
        "result": {
            "pagging": {"totCount": total, "pageNum": page, "pageSize": per_page},
            "youthPolicyList": [real_item()] * count,
        },
    }


class TestFetchPages:
    def test_paginates_until_total_count(self):
        calls = []

        def fake_get(url, params, timeout):
            calls.append(params)
            count = 100 if params["pageNum"] == 1 else 22
            return FakeResponse(envelope(params["pageNum"], 100, 122, count))

        pages = list(ontong_youth.fetch_pages("KEY", http_get=fake_get, sleep=lambda _: None))
        assert len(pages) == 2
        assert [call["pageNum"] for call in calls] == [1, 2]
        assert calls[0]["apiKeyNm"] == "KEY"
        assert calls[0]["mclsfNm"] == "창업"  # 수집 범위 고정 (ingest.md 규칙 1)
        assert calls[0]["rtnType"] == "json"

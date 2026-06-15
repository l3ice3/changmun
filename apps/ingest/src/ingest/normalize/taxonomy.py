"""표준 분류 정규화 — data-model.md §7 (category 11종+기타 / stage / audience / org_type / region).

열린 enum 원칙 (§6 규칙 6, AC-005): 미지값에 crash 금지.
- category: 미지값 → '기타' + 원본 로그
- 그 외(stage/audience/org_type/region): 미지값 → 버리고 로그 (억지 채움 금지, 원본은 raw 보존)
"""
import html
import re

# K-Startup 검색 UI 실제 11종 (§7) — 내부 구분자는 ㆍ(U+318D)가 표준
STANDARD_CATEGORIES = (
    "사업화",
    "기술개발(R&D)",
    "시설ㆍ공간ㆍ보육",
    "멘토링ㆍ컨설팅ㆍ교육",
    "글로벌",
    "인력",
    "융자ㆍ보증",
    "행사ㆍ네트워크",
    "창업교육",
    "판로ㆍ해외진출",
    "정책자금",
)
UNKNOWN_CATEGORY = "기타"

STAGE_MAP = {
    "예비창업자": "PRE_STARTUP",
    "1년미만": "LT_1Y",
    "2년미만": "LT_2Y",
    "3년미만": "LT_3Y",
    "5년미만": "LT_5Y",
    "7년미만": "LT_7Y",
    "10년미만": "LT_10Y",
}

AUDIENCE_MAP = {
    "청소년": "YOUTH",
    "대학생": "UNIV_STUDENT",
    "일반인": "GENERAL",
    "대학": "UNIVERSITY",
    "연구기관": "RESEARCH_INST",
    "일반기업": "COMPANY",
    "1인창조기업": "SOLO_CREATOR",
}

ORGANIZATION_TYPE_MAP = {
    "공공기관": "PUBLIC",
    "민간": "PRIVATE",
    "교육기관": "EDUCATION",
}

# 전국 + 17개 시도 + 해외 (§7). 라이브는 짧은 형태로 옴 — 풀네임만 추가 매핑
REGIONS = {
    "전국", "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주", "해외",
}
_REGION_FULL_NAME = {
    "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구",
    "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전",
    "울산광역시": "울산", "세종특별자치시": "세종", "경기도": "경기",
    "강원도": "강원", "강원특별자치도": "강원", "충청북도": "충북",
    "충청남도": "충남", "전라북도": "전북", "전북특별자치도": "전북",
    "전라남도": "전남", "경상북도": "경북", "경상남도": "경남",
    "제주특별자치도": "제주",
}

# 온통청년 mclsfNm → 표준 category 느슨 매핑 (§7). 비창업 슬라이스는 애초 수집하지 않는다(§6-C).
ONTONG_CATEGORY_MAP = {
    "창업": "사업화",
}
FACILITY_CATEGORY = "시설ㆍ공간ㆍ보육"  # STANDARD_CATEGORIES와 동일 라벨(ㆍ=U+318D)
# 공간·시설 대여 신호(§7 예외). "임차"는 '임차료 지원'(자금)과 구분 안 돼 제외 — 정밀도 우선(오분류>놓침).
_ONTONG_FACILITY_KEYWORDS = ("입주", "오피스", "창업공간", "거주지원")

# 법정동 코드 앞 2자리 → 시도 (행정표준코드. 강원 42→51, 전북 45→52 개편 코드 병기)
_ZIP_SIDO_PREFIX = {
    "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주",
    "30": "대전", "31": "울산", "36": "세종", "41": "경기",
    "42": "강원", "51": "강원", "43": "충북", "44": "충남",
    "45": "전북", "52": "전북", "46": "전남", "47": "경북", "48": "경남", "50": "제주",
}

_SPACES = re.compile(r"\s+")


def _category_key(value: str) -> str:
    """비교 키: 엔티티 디코딩 + 구분자 통일(· U+00B7 → ㆍ U+318D) + 공백 제거 (§7)."""
    return _SPACES.sub("", html.unescape(value).replace("·", "ㆍ"))


_CATEGORY_LOOKUP = {_category_key(label): label for label in STANDARD_CATEGORIES}


def normalize_category(value: str | None, unknown: list[str]) -> str | None:
    if value is None or not str(value).strip():
        return None
    label = _CATEGORY_LOOKUP.get(_category_key(str(value)))
    if label:
        return label
    unknown.append(f"category:{value}")
    return UNKNOWN_CATEGORY


def normalize_region(value: str | None, unknown: list[str]) -> str | None:
    if value is None or not str(value).strip():
        return None
    region = str(value).strip()
    if region in REGIONS:
        return region
    mapped = _REGION_FULL_NAME.get(region)
    if mapped:
        return mapped
    unknown.append(f"region:{value}")
    return None


def normalize_organization_type(value: str | None, unknown: list[str]) -> str | None:
    if value is None or not str(value).strip():
        return None
    mapped = ORGANIZATION_TYPE_MAP.get(str(value).strip())
    if mapped:
        return mapped
    unknown.append(f"organization_type:{value}")
    return None


def _normalize_tokens(
    value: str | None, mapping: dict[str, str], label: str, unknown: list[str]
) -> list[str] | None:
    """콤마 구분 토큰 → 표준 코드 (§6 규칙 7·8). 미지 토큰은 로그 후 제외, 결과 없으면 None."""
    if value is None or not str(value).strip():
        return None
    codes: list[str] = []
    for token in str(value).split(","):
        key = _SPACES.sub("", token)
        if not key:
            continue
        code = mapping.get(key)
        if code is None:
            unknown.append(f"{label}:{token.strip()}")
            continue
        if code not in codes:
            codes.append(code)
    return codes or None


def normalize_ontong_category(value: str | None, title: str | None, unknown: list[str]) -> str | None:
    # 제목에 공간 대여 신호가 있으면 우선 매핑 (§7: 공간/오피스 대여 → 시설ㆍ공간ㆍ보육)
    if title and any(keyword in title for keyword in _ONTONG_FACILITY_KEYWORDS):
        return FACILITY_CATEGORY
    if value is None or not str(value).strip():
        return None
    mapped = ONTONG_CATEGORY_MAP.get(str(value).strip())
    if mapped:
        return mapped
    unknown.append(f"category:{value}")
    return UNKNOWN_CATEGORY


def sido_from_zip_codes(value: str | None, unknown: list[str]) -> str | None:
    """법정동 5자리 코드(콤마 복수) → 시도. 단일 시도일 때만 채운다 — 복수는 보류(NULL, raw 보존).

    단일 region 컬럼이라 best-effort (§6-C 규칙 2). 억지 채움 금지 원칙 준용.
    """
    if value is None or not str(value).strip():
        return None
    matched = _distinct_sido_of(str(value), unknown)
    if len(matched) == 1:
        return next(iter(matched))
    return None


def _distinct_sido_of(joined: str, unknown: list[str]) -> set[str]:
    matched: set[str] = set()
    for code in joined.split(","):
        trimmed = code.strip()
        if not trimmed:
            continue
        sido = _ZIP_SIDO_PREFIX.get(trimmed[:2])
        if sido is None:
            unknown.append(f"region_zip:{trimmed}")
            continue
        matched.add(sido)
    return matched


def normalize_stages(value: str | None, unknown: list[str]) -> list[str] | None:
    return _normalize_tokens(value, STAGE_MAP, "target_startup_stage", unknown)


def normalize_audiences(value: str | None, unknown: list[str]) -> list[str] | None:
    return _normalize_tokens(value, AUDIENCE_MAP, "target_audience_type", unknown)

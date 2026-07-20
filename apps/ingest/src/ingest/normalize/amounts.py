"""지원금 규모 추출 — data-model.md §6-E (FR-008 데이터 파트).

원칙: 정밀도 > 채움률. 틀린 금액 표시가 미표시보다 나쁘다(마케팅 지표로 쓰이므로 더욱).
확실한 수식어("기업당·최대" / "총 사업비")가 붙은 금액만 추출하고, 아니면 None.
자격 조건("매출액 X 이하")·융자/보증 한도는 지원금이 아니므로 명시적으로 배제한다.
"""
import re
from dataclasses import dataclass
from decimal import Decimal

from ingest.normalize.taxonomy import STANDARD_CATEGORIES

# 융자·보증 분야 공고의 금액은 한도액(상환 대상)이라 지원금과 성격이 다름 — 분야 단위 배제 (§6-E 규칙 4)
_LOAN_CATEGORY = "융자ㆍ보증"
assert _LOAN_CATEGORY in STANDARD_CATEGORIES

_UNIT_VALUES = {"억": 10**8, "천만": 10**7, "백만": 10**6, "만": 10**4}
# 금액 조각: "1.5억" "5,000만" "700백만" "500,000"
_AMOUNT_PART = r"\d[\d,]*(?:\.\d+)?\s*(?:억|천만|백만|만)?"
# 금액 표현: 조각 1개 이상 + 원 ("1억 5천만 원" 조합), 또는 원 생략형("최대 1.5억 지원" — Codex).
# 원 생략은 억·천만·백만으로 끝날 때만 — bare "만"은 "10만 명"류(수량) 오인 위험이라 제외.
_AMOUNT = (
    rf"(?:{_AMOUNT_PART}\s*)+원"
    rf"|(?:{_AMOUNT_PART}\s*)*\d[\d,]*(?:\.\d+)?\s*(?:억|천만|백만)"
)

# 범위 "5천만~1억원"·"1억 5천만원~2억원" → 하한을 매치에 포함(원문 표기 보존)하되 값은
# 상한만 취한다 (§6-E 규칙 5·7). 하한을 사전 삭제하면 support_amount 원문이 잘려
# 노출된다(Codex 8차) — 매치는 원문 그대로, 파싱만 마지막 ~ 뒤 구간으로.
_RANGE_PREFIX = rf"(?:(?:{_AMOUNT_PART}\s*)+원?\s*[~∼]\s*)?"
_AMOUNT_EXPR = rf"{_RANGE_PREFIX}(?:{_AMOUNT})"

# 컬럼 구분 수식어 (§6-E 규칙 2). 총액을 먼저 잡고, 겹치는 구간은 기업당 매칭에서 제외한다.
# bare "총 X원"은 쓰지 않는다 — 라이브 전수 검수에서 "월 20만원 한도, 총 60만원"처럼
# 개인 수령 총액을 사업 예산으로 오분류함이 확인됨(2026-07-18). 명시 표현만 인정:
# 전위형("총 사업비/총 예산/총 지원 규모 X원") + 후위형("총 X원 규모" — §6-E, Codex)
_TOTAL_PATTERNS = (
    re.compile(rf"(?:총\s*사업비|총\s*예산|총\s*지원\s*규모)\s*(?:최대\s*)?({_AMOUNT_EXPR})"),
    re.compile(rf"총\s*({_AMOUNT_EXPR})\s*규모"),
)
_PER_COMPANY = re.compile(
    rf"(?:기업당|팀당|과제당|개사당|업체당|1개사당|1인당|인당|최대)\s*({_AMOUNT_EXPR})"
)

# 융자성 문서 가드 — 본문에 상환·융자·대출·보증이 등장하면 문서 전체를 추출 대상에서 제외.
# 라이브 전수 검수: "업체당 최대 50백만원 … 상환방법"(특례보증)·"최대 5억원 대출 지원"(융자)이
# 창 기반 배제를 빠져나감 → 혼합 문서는 통째로 포기(오추출 > 놓침 금지). '보증금'(임대차)은 예외.
_LOAN_DOCUMENT = re.compile(r"상환|융자|대출|보증(?!금)")

# 제외 문맥 (§6-E 규칙 4, AC-029) — 매치 주변 창에서 발견되면 해당 후보 폐기.
# '투자'는 넣지 않는다: 자격형("X원 이상 투자 유치")은 수식어 부재+이상/이하 가드가 이미 거르고,
# 재원형("직접투자 검토(총 2억원)")은 정당한 총액이다 (라이브 표본).
# "N년간/N개년 최대 X원"은 프로그램 다년 예산이지 기업당 지원금이 아니다
# (라이브 검수 2026-07-18: "3년간 최대 15억원 이내 지원" — 캠퍼스타운 단위사업 예산).
# '보증'은 융자성 배제지만 '보증금'(임대차 용어)은 예외 — _LOAN_DOCUMENT와 동일 규칙 (Codex 10차)
_EXCLUDE_BEFORE = re.compile(r"(매출|자본금|보증(?!금)|융자|대출|출연금|연\s*소득|소득|\d+\s*년\s*간|\d+\s*개년)")
# 이하/미만류는 금액 직후(앵커), 자격 명사(매출 등)는 뒤 창 어디든 — "최대 10억원 매출 기업 대상" (Codex 7차)
_EXCLUDE_AFTER = re.compile(r"^\s*(?:원)?\s*(이하|미만|이상|을?\s*초과)|매출|자본금|소득")
_BEFORE_WINDOW = 14
_AFTER_WINDOW = 8

# 오파싱 방어 한계 — 10만원 미만·1조 초과는 지원금 표기로 보기 어려움
_MIN_AMOUNT = 100_000
_MAX_AMOUNT = 1_000_000_000_000
# 기업당 상한 20억 — 실존 최대급이 팁스 딥테크 15억. 그 이상("4년간 최대 80억")은
# 사업단·기수 예산이 '최대' 수식어로 잡힌 것 (라이브 검수 2026-07-18). total로 옮기는 건 추측이라 버린다.
_MAX_PER_COMPANY = 2_000_000_000


@dataclass(frozen=True)
class ExtractedAmounts:
    """추출 결과 — 값이 없으면 전부 None (컬럼을 건드리지 않는다는 뜻)."""

    max_support_amount: int | None = None
    total_program_budget: int | None = None
    source_text: str | None = None


_EMPTY = ExtractedAmounts()


def extract_amounts(text: str | None, category: str | None = None) -> ExtractedAmounts:
    """본문에서 (기업당 최대 지원액, 사업 전체 예산, 대표 원문 표기)를 보수적으로 추출."""
    if not text or category == _LOAN_CATEGORY or _LOAN_DOCUMENT.search(text):
        return _EMPTY
    total_value, total_text, total_spans = None, None, []
    for pattern in _TOTAL_PATTERNS:
        value, matched_text, spans = _best_match(pattern, text)
        total_spans.extend(spans)
        if value is not None and (total_value is None or value > total_value):
            total_value, total_text = value, matched_text
    max_value, max_text, _ = _best_match(
        _PER_COMPANY, text, skip_spans=total_spans, upper_bound=_MAX_PER_COMPANY
    )
    if max_value is None and total_value is None:
        return _EMPTY
    return ExtractedAmounts(
        max_support_amount=max_value,
        total_program_budget=total_value,
        source_text=max_text or total_text,
    )


def _best_match(
    pattern: re.Pattern,
    text: str,
    skip_spans: list[tuple[int, int]] | None = None,
    upper_bound: int = _MAX_AMOUNT,
) -> tuple[int | None, str | None, list[tuple[int, int]]]:
    """패턴의 유효 매치 중 최대 금액을 고른다 — 트랙이 여럿이면 '적용 가능한 최대'가 답."""
    best_value: int | None = None
    best_text: str | None = None
    spans: list[tuple[int, int]] = []
    for match in pattern.finditer(text):
        if _overlaps(match.span(), skip_spans or []):
            continue
        if _excluded_by_context(text, match):
            continue
        value = _parse_amount(match.group(1))
        if value is None or value > upper_bound:
            continue
        spans.append(match.span())
        if best_value is None or value > best_value:
            best_value = value
            best_text = re.sub(r"\s+", " ", match.group(0)).strip()
    return best_value, best_text, spans


def _excluded_by_context(text: str, match: re.Match) -> bool:
    before = text[max(0, match.start() - _BEFORE_WINDOW):match.start()]
    after = text[match.end():match.end() + _AFTER_WINDOW]
    return bool(_EXCLUDE_BEFORE.search(before)) or bool(_EXCLUDE_AFTER.search(after))


def _overlaps(span: tuple[int, int], spans: list[tuple[int, int]]) -> bool:
    return any(span[0] < end and start < span[1] for start, end in spans)


def _parse_amount(amount_text: str) -> int | None:
    """"1억 5,000만" 조합을 원 단위 정수로 — 한계 밖이면 None(오파싱 방어).

    범위("5천만~1억원")는 마지막 ~ 뒤(상한)만 값으로 취한다 — 원문 표기는 매치가 보존(§6-E 규칙 5·7).
    소수 표기("0.29억")는 float 오차로 1원이 어긋날 수 있어 Decimal로 정확 변환한다(Codex).
    """
    upper_text = re.split(r"[~∼]", amount_text)[-1]
    total = Decimal(0)
    for number, unit in re.findall(r"(\d[\d,]*(?:\.\d+)?)\s*(억|천만|백만|만)?", upper_text):
        total += Decimal(number.replace(",", "")) * _UNIT_VALUES.get(unit, 1)
    value = int(total)
    if value < _MIN_AMOUNT or value > _MAX_AMOUNT:
        return None
    return value

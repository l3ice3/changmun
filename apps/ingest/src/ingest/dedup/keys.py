"""정규화 키 — data-model.md §6-D 규칙 1.

norm_title = 제목 − [지역] 접두 − 연도 − 차수(N차) − 상투어 + 공백·구분자 통일.
norm_org   = 기관명 약어사전 정규화 + 공백 제거.
"""
import re

from ingest.normalize.taxonomy import REGION_INPUT_LABELS

# §6-D는 '[지역]' 접두만 제거하라고 한다 — [소셜벤처]·[KOTRA] 등 비-지역 접두를 지우면
# 서로 다른 트랙이 오합치된다(Codex). 괄호 안이 지역명일 때만 접두를 제거한다.
# 표준값이 아니라 '인식 표기 전체'를 쓴다 — 과도기 구표기([광주]·[전남]·풀네임) 접두도
# 지워져야 veto_tokens에 지역 잔여물이 남아 병합을 막지 않는다 (Codex).
_REGION_BRACKET = re.compile(
    r"^\s*[\[(](?:" + "|".join(sorted(REGION_INPUT_LABELS, key=len, reverse=True)) + r")[\])]\s*"
)
# '2026년도'/'2026년' 혼용 대응 — '년' 뒤 '도'까지 연도 noise로 제거 (Codex)
_YEAR = re.compile(r"(19|20)\d{2}\s*년?도?")
_ROUND = re.compile(r"\d+\s*차")
_SEPARATORS = re.compile(r"[\[\]()<>「」『』·ㆍ\-–—_/,.:;'\"~!?]")
_SPACES = re.compile(r"\s+")
_BOILERPLATE_PHRASES = ("모집 공고", "모집공고", "참여기업", "시행계획")

_ORGANIZATION_ALIASES = {
    "중기부": "중소벤처기업부",
    "과기부": "과학기술정보통신부",
    "과기정통부": "과학기술정보통신부",
    "산업부": "산업통상자원부",
    "고용부": "고용노동부",
    "행안부": "행정안전부",
    "창진원": "창업진흥원",
}
# 법인격 접두 — 같은 기관을 소스마다 "(재)대구디지털혁신진흥원"/"대구디지털혁신진흥원"으로
# 표기해 기관일치가 깨진다(라이브 2026-07-15). 식별에 기여하지 않는 접두만 제거.
_LEGAL_FORM_PREFIX = re.compile(r"^(\(재\)|\(사\)|\(주\)|\(유\)|재단법인|사단법인|주식회사)")


def norm_title(title: str) -> str:
    text = _strip_noise(title)
    text = _ROUND.sub(" ", text)
    return _SPACES.sub(" ", text).strip().lower()


def veto_tokens(title: str) -> frozenset[str]:
    """실질 차이 판정용 토큰 — 차수(N차)는 유지한다.

    유사도 키(norm_title)에선 차수를 제거하지만(§6-D), 마감일까지 같은 1차/2차 공고가
    병합되는 오합치(AC-008)를 막으려면 차이 비교에서는 차수가 살아 있어야 한다.
    """
    text = _strip_noise(title)
    return frozenset(_SPACES.sub(" ", text).strip().lower().split())


def _strip_noise(title: str) -> str:
    text = _REGION_BRACKET.sub("", title)
    text = _YEAR.sub(" ", text)
    for phrase in _BOILERPLATE_PHRASES:
        text = text.replace(phrase, " ")
    return _SEPARATORS.sub(" ", text)


def norm_org(organization: str | None) -> str | None:
    if organization is None or not organization.strip():
        return None
    compact = _LEGAL_FORM_PREFIX.sub("", _SPACES.sub("", organization))
    if not compact:
        return None
    return _ORGANIZATION_ALIASES.get(compact, compact)

"""pg_trgm 호환 trigram 유사도 — data-model.md §6-D 스코어링의 similarity(norm_title).

pg_trgm 방식: 소문자화 → 단어 분리 → 단어마다 앞 2칸·뒤 1칸 공백 패딩 → 3-gram 집합 → 자카드 유사도.
DB 확장과 같은 정의를 쓰므로 검색(pg_trgm)과 dedup의 유사도 기준이 일치한다.
"""
import re

_WORD = re.compile(r"[^\W_]+", re.UNICODE)


def trigram_similarity(left: str, right: str) -> float:
    left_grams = _trigrams(left)
    right_grams = _trigrams(right)
    if not left_grams or not right_grams:
        return 0.0
    intersection = len(left_grams & right_grams)
    union = len(left_grams | right_grams)
    return intersection / union


def _trigrams(text: str) -> set[str]:
    grams: set[str] = set()
    for word in _WORD.findall(text.lower()):
        padded = "  " + word + " "
        for index in range(len(padded) - 2):
            grams.add(padded[index:index + 3])
    return grams

"""throwaway: Codex 리뷰 출력 언어(한국어/영어) 확인용 테스트.

이 PR은 머지하지 않고 닫는다. 리뷰봇이 아래 결함을 지적하는지,
그리고 그 지적이 한국어로 나오는지 확인하려는 목적뿐이다.
"""


def accumulate(items, bucket=[]):  # 가변 기본 인자 — 의도적 결함(리뷰가 지적하길 기대)
    bucket.extend(items)
    return bucket

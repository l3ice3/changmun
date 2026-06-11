"""dedup — 정규화 키 → 마감일 블로킹 → 스코어링 → Union-Find → canonical 선정.

규칙: data-model.md §6-D. 임계 0.85는 상수로 분리(튜닝 대상). 오합치 > 놓침.
"""

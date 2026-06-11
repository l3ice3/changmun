"""DB 적재 — UPSERT: ON CONFLICT (source, external_id).

멱등성은 DB가 보장한다 — 존재 확인 후 INSERT 패턴 금지(레이스). (ingest.md 규칙 3)
구현은 FR-001에서. 접속 정보는 환경변수로만.
"""

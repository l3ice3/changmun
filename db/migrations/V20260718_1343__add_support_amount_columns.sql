-- 지원금 규모 컬럼 신설 (FR-008 데이터 파트 — data-model.md §2/§6-E [LOCKED] 동기화).
-- 본문 보수 추출(정밀도>채움률)로 채우며, 신호 없으면 NULL 유지(억지 채움 금지).
-- 기존 support_amount(TEXT)는 원문 표기 보존용으로 병행 사용.
ALTER TABLE opportunity
    ADD COLUMN max_support_amount   BIGINT,   -- 기업당/1인당 최대 지원액(원)
    ADD COLUMN total_program_budget BIGINT;   -- 사업 전체 예산(원)

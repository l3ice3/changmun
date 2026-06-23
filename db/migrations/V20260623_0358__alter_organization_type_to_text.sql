-- organization_type: VARCHAR(20) → TEXT. sprv_inst 원문(표시용) 저장으로 바뀌면서,
-- 20자 초과 원문이 오면 executemany 페이지 적재가 실패해 소스 수집 전체가 중단되는 잠재 버그를 제거한다.
-- (organization과 동일하게 자유 텍스트 = TEXT. data-model.md §2 [LOCKED] 동기화.)
ALTER TABLE opportunity ALTER COLUMN organization_type TYPE TEXT;

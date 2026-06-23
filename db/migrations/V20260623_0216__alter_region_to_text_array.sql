-- region: 단일 VARCHAR → TEXT[] (복수 지역 보존 → 필터 누락 방지). data-model.md §2/§7 [LOCKED] 동기화.
-- 순서: 의존 인덱스(btree) 먼저 제거 → 타입 변경(기존 값은 1원소 배열로, NULL은 NULL) → GIN 재생성.
DROP INDEX IF EXISTS idx_opportunity_region;

ALTER TABLE opportunity
    ALTER COLUMN region TYPE TEXT[]
    USING (CASE WHEN region IS NULL THEN NULL ELSE ARRAY[region] END);

-- 배열 멤버십(= ANY / &&)용
CREATE INDEX idx_opportunity_region ON opportunity USING gin (region);

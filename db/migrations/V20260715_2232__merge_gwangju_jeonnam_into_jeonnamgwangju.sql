-- region 표준 개정: 광주+전남 → '전남광주' (2026 행정구역 통합 — 전남광주통합특별시).
-- data-model.md §7 [LOCKED] 동기화. 표준은 16개 시도가 되고, 기존 적재분의 구표기를 일괄 이관한다.
-- (스키마 변경 없음 — 데이터 정정. 이후 배치는 ingest 사전이 광주/전남/신표기/법정동 12·29·46을
--  전부 '전남광주'로 정규화하므로 재발하지 않는다.)
UPDATE opportunity
SET region = (
    SELECT array_agg(DISTINCT CASE WHEN sido IN ('광주', '전남') THEN '전남광주' ELSE sido END
                     ORDER BY CASE WHEN sido IN ('광주', '전남') THEN '전남광주' ELSE sido END)
    FROM unnest(region) AS sido
)
WHERE region && ARRAY['광주', '전남']::text[];

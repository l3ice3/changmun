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

-- backfill: 개정 전 사전에선 신표기('전남광주'·법정동 프리픽스 12)가 미지값이라 버려져
-- region이 NULL/부분 저장된 기존 행 보정. 프로덕션 ingest는 수동 실행(cron 없음)이라
-- 재수집에 기대지 않고 여기서 이관한다. 원본(raw)의 신표기 신호가 확실한 행에만
-- '전남광주'를 추가(append-only) — 전체 정규화 재현이 아니라 새 토큰 보정만.
UPDATE opportunity
SET region = (
    SELECT array_agg(DISTINCT sido ORDER BY sido)
    FROM unnest(COALESCE(region, '{}'::text[]) || ARRAY['전남광주']) AS sido
)
WHERE NOT COALESCE(region, '{}'::text[]) @> ARRAY['전남광주']
  AND (
       (source = 'ontong-youth'
        AND raw->>'zipCd' ~ '(^|,)\s*12\d{3}')
    OR (source = 'k-startup'
        AND string_to_array(replace(COALESCE(raw->>'supt_regin', ''), ' ', ''), ',') @> ARRAY['전남광주'])
    OR (source = 'bizinfo'
        AND string_to_array(replace(COALESCE(raw->>'hashtags', ''), ' ', ''), ',') @> ARRAY['전남광주'])
  );

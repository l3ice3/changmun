# rules/api.md — apps/api (Spring Boot, Java, Gradle Kotlin DSL)

> 읽기 전용 서빙 API. 근거: `docs/api-spec.md`(계약), PRD FR-003·004·005·007.

## 구조 (단순 레이어드 — 작은 읽기 API라 과설계 금지)
```
src/main/java/.../
  controller/   # OpportunityController, GlossaryController, EventController
  service/      # 조회 로직, status/dDay/badges 계산 (api-spec §0 산식 그대로)
  repository/   # Spring Data JPA + 네이티브 쿼리(배열 contains, pg_trgm)
  domain/       # 엔티티 (스키마와 1:1 — Flyway가 만든 걸 매핑만)
  config/       # CORS, Jackson(camelCase), 에러 핸들러({error:{code,message}})
src/test/java/  # 슬라이스 테스트 — AC-011~021, 023 대응
```

## 규칙
1. **`ddl-auto=validate` 고정.** 엔티티가 스키마와 안 맞으면 기동 실패가 정답(엔티티를 고친다, 스키마를 바꾸지 않는다).
2. **status·dDay·closingSoon·badges는 service에서 계산** — api-spec §0 산식이 유일한 정의. DB 저장 금지, 프론트 위임 금지.
3. **리스트/검색 쿼리에 `is_canonical = true` 고정.** `ids=` 조회만 예외.
4. 페르소나 매핑은 api-spec enum 그대로: `PRE_STARTUP` / `UNIV_STUDENT` / `EARLY_STAGE`(={LT_1Y,LT_2Y,LT_3Y}).
5. **모든 사용자 입력은 파라미터 바인딩** — 문자열 조립 쿼리 절대 금지 (AC-021). `q`는 최소 2글자 검증(400).
6. 잘못된 enum 파라미터 → 400 `INVALID_PARAM` / 범위 초과 page → 200 + 빈 items (AC-014).
7. `/api/events`: payload 키 화이트리스트 검증, 그 외 키 400. 202 응답. PII 필드 자체가 스키마에 없어야 함 (AC-027).
8. 쓰기 엔드포인트는 events뿐 — 그 외 POST/PUT/DELETE 추가 금지(Out-of-Scope).

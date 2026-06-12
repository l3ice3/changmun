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

## Spring / JPA 세부
- **생성자 주입 + `final`.** `@Autowired` 필드 주입 금지. Lombok은 **제한적 허용**: `@RequiredArgsConstructor`·`@Slf4j`·`@Getter`만. `@Data`·엔티티 전체 `@Setter` 금지(무분별 setter·getter 노출은 Tell-Don't-Ask 위배 — `rules-core.md`).
- **엔티티를 컨트롤러 응답으로 직접 반환 금지.** 응답 DTO는 불변 `record`(`XxxResponse`), 변환은 `XxxResponse.from(entity)` 정적 팩토리.
- **`@Column`/`@Table`에 DB명을 명시한다.** camelCase↔snake_case 자동 변환에 의존하지 않는다(사람마다 결과가 갈린다). 엔티티는 스키마와 1:1 매핑만.
- **연관관계 기본 LAZY**(`fetch = FetchType.LAZY` 명시, EAGER 금지). 목록 조회 N+1은 `fetch join` 또는 `@EntityGraph`로 해소.
- **조회 트랜잭션은 `@Transactional(readOnly = true)`.** (읽기 전용 API라 사실상 전부)
- 날짜/시각 타입: 시점값은 `Instant`+`TIMESTAMPTZ`(예: `first_seen_at`·`updated_at`), 날짜는 `LocalDate`+`DATE`. **타임존 없는 `LocalDateTime` 금지**(UTC 통일이 깨진다).
- 스키마 변경은 `/db/migrations`에 **타임스탬프 버전명**(`V{yyyyMMdd_HHmm}__설명.sql`)으로만. 기존 파일 수정·삭제 금지. (`docs/rules/git.md` 충돌 예방)

## 로깅
- SLF4J(`@Slf4j`) 사용. **파라미터화 로깅** — 문자열 `+` 연결 금지: `log.info("조회 완료. id={}", id)`.
- **예외는 마지막 인자로 넘긴다**(스택트레이스 보존): `log.error("외부 API 실패. url={}", url, e)`.
- 예상된 비즈니스 예외=WARN / 예상 못한 예외=ERROR(스택트레이스) / 주요 흐름=INFO. 반복문 안 INFO 금지. 로그를 흐름 제어에 쓰지 않는다.
- **로그에 PII·시크릿 금지**(절대규칙 6). event payload·식별 정보가 로그에 새지 않게 한다.
- 요청별 추적은 trace ID를 MDC에 넣고 끝나면 제거(`OncePerRequestFilter`). 구현은 `config/`.

## 테스트 (통합 DB)
- Repository 쿼리·전체 흐름 통합 테스트는 **Testcontainers(실 PostgreSQL)** 로 한다. H2 등 인메모리로 흉내내지 않는다 — `pg_trgm`·JSONB·배열 contains가 H2에선 거짓 통과를 만든다. (테스트 전략 일반은 `rules-core.md`)

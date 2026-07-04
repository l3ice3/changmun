---
paths:
  - "apps/api/**"
---

# rules/api.md — apps/api (Spring Boot, Java, Gradle Kotlin DSL)

> 읽기 전용 서빙 API. 근거: `docs/api-spec.md`(계약), PRD FR-003·004·005·007.

## 구조 (도메인 단위 패키지 + 도메인 내부 레이어 하위패키지 — 과설계 금지)
```
src/main/java/com/changmun/
  opportunity/   # 공고 도메인
    controller/  # OpportunityController — 위임만
    service/     # 유스케이스 조립 + 기준일(today) 주입. 산식은 도메인에 위임(여기서 if-getter로 풀지 않음)
    repository/  # Spring Data JPA 인터페이스 + 네이티브 쿼리(배열 contains, pg_trgm)
    domain/      # 엔티티(스키마와 1:1 매핑) + 값 객체(status·badges 산식 캡슐화)
    dto/         # 응답/요청 record (XxxResponse.from(...))
  glossary/      # 용어풀이 도메인 (controller/service/repository/domain/dto)
  event/         # 이벤트 로그 도메인 (controller/service/repository/domain/dto)
  common/        # 도메인 공통 — config(CORS·Jackson camelCase·RFC7807 전역 에러 핸들러) + web(공유 예외)
src/test/java/   # 본 패키지를 미러링. 슬라이스 테스트 — AC-011~021, 023 대응
```
> 도메인 우선 분리이되, **레이어 하위패키지명(`controller`/`service`/`repository`/`domain`)은 그대로 유지**한다 — `ArchitectureTest`의 `..controller..`/`..service..`/`..domain..`/`..repository..` 계층 규칙이 이 이름에 의존한다(`rules-full.md §6`). 새 도메인도 이 5칸(+필요 시 dto)을 따른다. 도메인 간 의존(예: opportunity가 glossary 용어를 조립)은 service/dto 레벨에서 명시적 import로 허용되지만, `..domain..` 순수성·repository 접근 제한은 계속 유효하다.
> 읽기 전용이라 도메인은 "상태 변경" 대신 **"산식에 답하는"** 역할이 핵심이다. 정확히 어떤 모양인지는 아래 **§코드 예시**를 그대로 따른다.

## 규칙
1. **`ddl-auto=validate` 고정.** 엔티티가 스키마와 안 맞으면 기동 실패가 정답(엔티티를 고친다, 스키마를 바꾸지 않는다).
2. **status·dDay·closingSoon·badges 산식은 도메인 값 객체에 캡슐화** — service는 기준일(today)을 주입해 호출만 한다(산식을 service에 if-getter로 펼치지 않음). api-spec §0이 유일한 정의. DB 저장 금지, 프론트 위임 금지.
3. **리스트/검색 쿼리에 `is_canonical = true` 고정.** `ids=` 조회만 예외.
4. 페르소나 매핑은 api-spec enum 그대로: `PRE_STARTUP` / `UNIV_STUDENT` / `EARLY_STAGE`(={LT_1Y,LT_2Y,LT_3Y}).
5. **모든 사용자 입력은 파라미터 바인딩** — 문자열 조립 쿼리 절대 금지 (AC-021). `q`는 최소 2글자 검증(400).
6. 잘못된 enum 파라미터 → 400 `INVALID_PARAM` / 범위 초과 page → 200 + 빈 items (AC-014).
7. `/api/v1/events`: payload 키 화이트리스트 검증, 그 외 키 400. 202 응답. PII 필드 자체가 스키마에 없어야 함 (AC-027).
8. 쓰기 엔드포인트는 events + **로그인 사용자의 bookmark(POST/DELETE, 인증 필요)** 뿐. 그 외 POST/PUT/DELETE 추가 금지(Out-of-Scope).
9. **에러 응답은 RFC7807 `ProblemDetail`로 통일**(전역 `@RestControllerAdvice` 한 곳). 직접 에러 JSON 조립 금지. `code`(`INVALID_PARAM`/`NOT_FOUND`/`INTERNAL`)는 ProblemDetail 확장 필드로 실어 프론트 분기를 유지 (api-spec §0). 요청 검증은 `@Valid` + 전역 핸들러 — 수동 검증 분기 금지.

## 코드 예시 — 이 모양으로 만든다
> 추상 원칙(`rules-core.md`)을 이 프로젝트에 적용한 **정답 형태**. 새 코드는 아래 4개 패턴을 그대로 따른다.

### 1) 산식은 값 객체가 안다 (Tell, Don't Ask)
`status`·`dDay`는 데이터를 꺼내 service에서 분기하지 말고 **값 객체에 묻는다**. `else`·삼항 없이 early return으로 평탄화한다.
```java
// domain/ — api-spec §0 산식의 유일한 구현 위치
public record OpportunityStatus(StatusCode code, Integer dDay) {
    private static final int CLOSING_SOON_DAYS = 7;

    // 불변식: dDay는 OPEN일 때만 존재(api-spec). 불일치 상태를 생성자에서 차단 → 내부 분기는 code로만 한다.
    public OpportunityStatus {
        if ((code == StatusCode.OPEN) != (dDay != null)) {
            throw new IllegalArgumentException("dDay는 OPEN일 때만 존재한다: " + code);
        }
    }

    public static OpportunityStatus on(LocalDate today, boolean alwaysOpen, LocalDate deadline) {
        if (alwaysOpen) {
            return new OpportunityStatus(StatusCode.ALWAYS_OPEN, null);
        }
        if (deadline == null) {
            return new OpportunityStatus(StatusCode.UNDATED, null);   // 기간 미상 — 숨기지 않음
        }
        if (deadline.isBefore(today)) {
            return new OpportunityStatus(StatusCode.CLOSED, null);
        }
        return new OpportunityStatus(StatusCode.OPEN, (int) DAYS.between(today, deadline));
    }

    public boolean isClosingSoon() {
        return code == StatusCode.OPEN && dDay <= CLOSING_SOON_DAYS;
    }
}
```

### 2) 엔티티는 getter 대신 행위로 답한다
엔티티는 스키마와 1:1 매핑만 하되, **계산은 산식 객체에 위임하는 행위 메서드**로 노출한다. raw getter를 꺼내 service에서 판단하지 않는다.
```java
@Entity
@Table(name = "opportunity")
public class Opportunity {
    @Column(name = "is_always_open") private boolean alwaysOpen;
    @Column(name = "application_deadline") private LocalDate applicationDeadline;
    // ... 나머지 컬럼 (스키마 1:1)

    public OpportunityStatus statusOn(LocalDate today) {
        return OpportunityStatus.on(today, alwaysOpen, applicationDeadline);
    }
}
```
```java
// 안티패턴(금지): service가 getter를 꺼내 분기 — Tell-Don't-Ask·early-return 위배
if (o.getApplicationDeadline() != null && o.getApplicationDeadline().isBefore(today)) { ... }
// 올바름: 객체에 묻는다
OpportunityStatus status = opportunity.statusOn(today);
```

### 3) 엔티티 → 응답 DTO는 `from()` 정적 팩토리
엔티티를 컨트롤러 밖으로 내보내지 않는다. 응답은 불변 `record`, 변환은 `XxxResponse.from(...)` 한 곳. `dDay` 부재는 "OPEN 아님"을 뜻하며 값 객체 불변식이 강제한다 — 그 null은 **응답 JSON에만** 싣고, 내부 분기는 null이 아니라 `status`/`code`로 한다.
```java
public record OpportunityResponse(
        Long id, String status, Integer dDay, boolean closingSoon, List<String> badges /* ...api-spec §1 필드... */) {

    public static OpportunityResponse from(Opportunity opportunity, LocalDate today) {
        OpportunityStatus status = opportunity.statusOn(today);
        return new OpportunityResponse(
                opportunity.getId(),
                status.code().name(),
                status.dDay(),
                status.isClosingSoon(),
                opportunity.badgesOn(today).codes() /* 라벨 아님 — 배지 "코드" 배열. 라벨 렌더는 프론트(api-spec §0) */);
    }
}
```

### 4) Repository는 Spring Data JPA 인터페이스 + 파라미터 바인딩
인터페이스 자체가 추상화다 — **수동 구현(`JdbcXxxRepository`) 분리는 JPA에선 과설계, 금지.** 모든 입력은 `@Param` 바인딩(문자열 조립 금지 — AC-021). 리스트/검색은 `is_canonical = true` 고정 + 기본 `status=open`은 **진행중·상시·기간미상 포함, `CLOSED`만 제외**(api-spec §0/§1, AC-011·013). `status=all`이면 `onlyOpen=false`. 페르소나는 stage 코드 **집합**으로 펼쳐 배열 overlap(`&&`)으로 조회한다(EARLY_STAGE=`LT_1Y`/`2Y`/`3Y` 다중).
```java
public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {

    @Query(value = """
        SELECT * FROM opportunity
        WHERE is_canonical = true
          AND (:stages   IS NULL OR target_startup_stage && CAST(:stages AS text[]))                                       -- 배열 overlap: EARLY_STAGE 다중 코드
          AND (:audience IS NULL OR :audience = ANY(target_audience_type))
          AND (:onlyOpen = FALSE OR is_always_open OR application_deadline >= CURRENT_DATE OR application_deadline IS NULL)  -- 진행중·상시·기간미상 포함, CLOSED만 제외
        ORDER BY application_deadline ASC NULLS LAST
        """,
        countQuery = """
        SELECT count(*) FROM opportunity
        WHERE is_canonical = true
          AND (:stages   IS NULL OR target_startup_stage && CAST(:stages AS text[]))
          AND (:audience IS NULL OR :audience = ANY(target_audience_type))
          AND (:onlyOpen = FALSE OR is_always_open OR application_deadline >= CURRENT_DATE OR application_deadline IS NULL)
        """,
        nativeQuery = true)   // native + 배열연산 → count 자동 파생 불가, countQuery 필수
    Page<Opportunity> search(@Param("stages") String[] stages,   // String[]=text[] 바인딩(data-model §2 @JdbcTypeCode(SqlTypes.ARRAY) 일관). 페르소나→stage 코드 집합
                             @Param("audience") String audience,
                             @Param("onlyOpen") boolean onlyOpen,
                             Pageable pageable);
}
```
> 예외 처리(`ProblemDetail` + `code` 확장)의 정답 형태는 `docs/rules/rules-full.md §8` 코드 블록을 따른다.

## Spring / JPA 세부
- **생성자 주입 + `final`.** `@Autowired` 필드 주입 금지. Lombok은 **제한적 허용**: `@RequiredArgsConstructor`·`@Slf4j`·`@Getter`만. `@Data`·엔티티 전체 `@Setter` 금지(무분별 setter·getter 노출은 Tell-Don't-Ask 위배 — `rules-core.md`).
- **엔티티를 컨트롤러 응답으로 직접 반환 금지** — 위 §코드 예시 3) `XxxResponse.from(...)` 형태를 따른다.
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

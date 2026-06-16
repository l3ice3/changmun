# 코딩 규칙 — 전체 (rules-full.md)

> **이 문서는 참조용이다. 매 요청에 통째로 주입하지 않는다.**
> 상시 규칙은 `.claude/rules/rules-core.md`(apps/api 작업 시 자동 로드)가 담당하고, 아래 표에 따라 **해당 작업을 할 때만** 이 문서의 해당 섹션을 발췌해 함께 넣는다.
> 봇 위임 기준(리뷰 분담 A/B/C)은 루트 `AGENTS.md` §2를 본다.

### 발췌 라우팅 (작업 종류 → 읽을 섹션)
| 지금 하는 작업 | 함께 주입할 섹션 |
|---|---|
| 일반 구현 전부 | `.claude/rules/rules-core.md`만으로 충분(apps/api 작업 시 자동 로드) |
| 도메인 모델링 | §3 타입/값, §4 클래스, §5 공통/다형성 + **`.claude/rules/api.md §코드 예시`(정답 형태)** |
| 분기·중복 정리 | §5 공통/다형성, 부록 B 트리거 |
| 계층/저장 설계 | §6 계층, §7 트랜잭션 + **`persistence.md`**(작업단위·멱등·UPSERT) + **`api.md §코드 예시`** |
| 예외 처리 | §8 예외 (아래 코드 블록이 정답 형태) |
| 테스트 작성 | §9 테스트 + **`testing.md`**(실DB/Fake/Mock·안 하는 것·명세 준수) |

> **원칙은 여기(rules-full), 이 프로젝트에 적용한 구체 코드 예시는 `.claude/rules/api.md §코드 예시`에 있다.** 도메인·계층 코드를 짤 때는 반드시 그 예시 형태를 따른다(추상 원칙만 읽고 추측 구현 금지).

> 우선순위: **컨벤션/규칙 → 역할 분리 → 세부 로직**.
> **MUST** 위반은 반려. **SHOULD**는 정당한 이유 없으면 지킨다.

---

## 0. 세 가지 핵심 축

이 문서는 다음 세 가지를 흐트러뜨리지 않기 위해 존재한다.

1. **객체지향** — 데이터를 꺼내지 말고 객체에게 물어본다(Tell, Don't Ask).
2. **가독성** — 의도가 코드 자체로 드러나야 한다.
3. **공통 부분 관리** — 중복과 분기는 추상화로 흡수하고, 경계(계층)를 흐리지 않는다.

판단이 애매할 때는 이 세 축을 기준으로 결정한다.

---

## 1. 코드 스타일 (가독성)

- **MUST** Java Style Guide를 기본 원칙으로 따른다.
- **MUST** indent depth는 2까지만 허용한다 (3 이상 금지).
  - depth를 줄이는 가장 좋은 방법은 메서드 분리다.
- **MUST** 삼항 연산자를 쓰지 않는다.
- **MUST** `else`를 쓰지 않는다. `switch`/`case`로 우회하는 것도 금지한다.
  - early return으로 분기를 평탄화한다.
- **MUST** 메서드 길이는 20라인을 넘지 않는다.
- **MUST** 축약하지 않는다. 줄여 쓴 이름·표현을 쓰지 않는다.
- **MUST** 네이밍은 의도를 드러낸다.
  - 이름이 과하게 길거나 함축이 어렵다면 **책임이 한곳에 몰린 신호**다. 분리를 의심한다.
- **MUST** 매직 넘버·매직 스트링을 쓰지 않는다. 정책 값은 이름 붙인 상수/설정으로.
  - 예: dDay 임박 경계 `7`, dedup 임계 `0.85`, `ids` 최대 `50`, `q` 최소 `2`글자. 산식 상수의 단일 정의는 `api-spec.md §0`.

### 1-1. AI가 사람 승인 없이 단독으로 하지 않는 작업 (MUST NOT)
> `CLAUDE.md` 제1원칙·절대규칙의 코딩 관점 요약. 모호하면 **멈추고 질문**한다.
- **DB 스키마 변경** — `/db/migrations` Flyway SQL 추가 외 경로 금지. `ddl-auto`는 `validate` 고정.
- **계약 문서 변경을 코드 PR에 슬쩍 섞기** — PRD·AC·api-spec, 특히 `data-model.md`(**LOCKED**, 3인 합의).
- **API 필드명·enum·에러 형식 변경** — `api-spec.md` 그대로.
- **Out-of-Scope 기능 추가** — 로그인·추천·알림·관리자 UI·민간 수집·크롤링 라이브러리.
- **운영 설정·외부 키** — API 키 발급/커밋, branch protection 등은 `manual-required`(사람 작업, `git.md`).

---

## 2. 함수 / 메서드 (한 가지 일)

- **MUST** 메서드는 한 가지 일만 한다.
- **MUST** 인자는 4개까지 허용한다. 5개 이상 금지.
- **SHOULD** 인자 3개 이상이면 관련 값을 객체로 묶는다.
- **MUST** `public` 메서드(getter 제외)는 행위의 완결성 기준으로 테스트한다.

---

## 3. 타입 / 값 (객체지향)

- **SHOULD** 의미를 가진 원시 값·문자열은 포장한다(원시값 포장).
  - 단순 운반용 값까지 전부 포장해 클래스가 폭발하지 않게 한다. "검증 규칙·도메인 의미가 있는 값"에 한정한다.
- **MUST** 배열 대신 컬렉션을 사용한다.
- **MUST** 일급 컬렉션을 사용한다.
- **MUST** 멤버 필드 변경 여지가 없다면 **불변 객체**로 만든다.
- **MUST** "존재하지 않는 상태"를 `null`로 표현하지 않는다. 별도 객체(예: Null Object, 명시적 상태 타입)로 표현한다.
- **MUST** Tell, Don't Ask — 데이터를 꺼내 외부에서 판단하지 말고 객체에게 직접 물어본다.
- **MUST** 디미터의 법칙을 지킨다 (`a.getB().getC().doX()` 금지).
- **MUST** 캡슐화 — 외부 코드가 객체의 내부 결정에 의존하지 않게 한다.

---

## 4. 클래스 / 엔티티 (작게 유지)

- **MUST** 모든 엔티티를 작게 유지한다.
- **MUST** 인스턴스 변수 5개 이상인 클래스를 만들지 않는다.
- **MUST** 따로 노는 기능 묶음이 2개 이상이면 클래스를 나눈다.
- **MUST** 변경 이유가 다르면 분리한다(SRP).
- **SHOULD** 한 변경이 3곳 이상에 퍼지면 책임을 재분배한다. 변경 전 책임 분리를 먼저 확인한다.
- **MUST** 서로 다른 타입이 같은 종류의 상태를 들고 있으면, 책임을 한쪽으로 이동시킨다.

---

## 5. 공통 부분 관리 — 다형성 & 추상화

> 핵심 축. "공통을 어떻게 묶을지"의 기준을 명확히 한다.

- **MUST** 타입에 따른 `switch`/`if` 분기가 **2곳 이상** 반복되면, 인터페이스를 도입하고 각 구현체가 자신의 규칙을 갖게 한다.
- **MUST** 새 타입 추가 시 기존 코드 수정이 필요하면, **등록/생성 방식을 분리**한다(OCP).
- **MUST** 도메인 객체들이 같은 기능·같은 인스턴스를 2개 이상 공유하면, 상위 추상화 레벨에서 구현한다.

판단 순서:
1. 분기가 1곳뿐이면 그대로 둔다 (성급한 추상화 금지).
2. 2곳 이상 반복되면 다형성으로 전환한다.
3. 전환 후 "새 타입 추가 = 새 클래스 추가"만으로 끝나는지 검증한다.

---

## 6. 계층 / 경계 (공통 인프라 분리)

- **MUST** 도메인은 DB와 직접 통신하지 않는다. `Repository` 인터페이스로 통신을 감싼다.
- **MUST** `Service` 계층 외의 객체는 `Repository`를 몰라야 한다.
- **MUST** 계층별 역할:
  - **Controller** — 위임만. 로직을 최소화한다.
  - **Service / Domain** — 비즈니스 규칙.
  - **Repository** — 영속성.

---

## 7. 트랜잭션 / 저장 시점

- **MUST** 시스템 상태가 바뀌는 **최소 유효 단위(Atomic Transaction)**마다 즉시 영속화한다.
  - 장애 시 데이터 유실을 최소화하고 즉각 복구 가능성을 보장한다.
- **MUST** 묶음 판단:
  - 정합성을 **타이트하게** 지켜야 하면 → 반드시 한 트랜잭션으로 묶는다.
  - 정합성을 **느슨하게** 지켜도 되면 → 묶지 않고 서버 내부에서 처리한다.
  - **실패해도 핵심 상태의 의미가 바뀌지 않는 작업**(알림·로그·통계)은 → 트랜잭션 **밖**에서 처리한다.
    - 부가 작업 때문에 핵심 변경을 롤백하지 않는다.

---

## 8. 예외 처리

- **MUST** 커스텀 예외를 만들어 처리한다.
- **MUST** `@RestControllerAdvice`가 예외 ↔ HTTP status 매핑 책임을 갖는다.
- **MUST** `ProblemDetail`로 예외 응답 형식을 통일한다.
- **MUST** `ResponseEntityExceptionHandler`를 상속해 처리한다.
- **MUST** 로그 위치 규칙:
  - **예측 불가능한 500** → advice 메서드 안에서 로그를 찍는다.
  - **예측 가능했던 예외** → 발생 위치에서 로그를 찍는다.

```java
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String SERVER_ERROR_MESSAGE = "서버 내부에서 문제가 발생했습니다.";

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException exception,
                                                                  HttpHeaders headers,
                                                                  HttpStatusCode status,
                                                                  WebRequest request) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, "입력값이 올바르지 않습니다.");
        problemDetail.setProperty("errors", exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> new ValidationError(error.getField(), error.getDefaultMessage()))
                .toList());
        return handleExceptionInternal(exception, problemDetail, headers, status, request);
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ProblemDetail> handleInvalidRequestException(InvalidRequestException exception) {
        return problem(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleAllUncaughtException(Exception exception) {
        log.error("Unexpected exception occurred", exception);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, SERVER_ERROR_MESSAGE);
    }

    private ResponseEntity<ProblemDetail> problem(HttpStatus status, String detail) {
        return ResponseEntity.status(status)
                .body(ProblemDetail.forStatusAndDetail(status, detail));
    }
}
```

### 실패 안내 (사용자 경험)
- **MUST** 트랜잭션 실패 시, **서버 귀책**(내부 오류)과 **요청 조건 문제**(만석·권한 없음·이미 처리됨)를 구분해 안내한다.
  - 서버 귀책 → 재시도 안내.
  - 요청 조건 문제 → 조건 변경 또는 현재 상태 확인 안내.

---

## 9. 테스트 (TDD)

### 9.1 원칙
- **MUST** 모든 기능을 TDD로 구현한다. 단, UI(`System.out`, `System.in`) 로직은 제외.
- **MUST** 행위의 완결성 기준으로 테스트를 작성한다.
- **MUST** `public` 메서드(getter 제외)는 반드시 테스트한다.
- **MUST** 테스트가 어려우면 **설계를 리팩토링**한다. 랜덤·외부 의존은 값으로 주입받게 바깥으로 꺼낸다.
- **MUST** 테스트가 깨지면(데이터를 꺼내 검증하느라) 설계를 수정한다.

### 9.2 테스트 단위 선택 (어디서 검증할지)
| 대상 | 방식 |
|---|---|
| 도메인 로직 | **단위 테스트** |
| Service / Repository | **통합 테스트** (가장 큰 기반) |
| Controller | **E2E**에서 검증 |
| 너무 복잡한 로직 | **슬라이스 테스트** (예외적 허용) |

- **MUST** Service/Repository 통합 테스트를 가장 큰 기반으로 삼는다.
- **SHOULD** Service나 Repository 로직이 통합으로 처리하기 어려울 만큼 복잡한 경우에 **한해서만** 슬라이스 테스트를 허용한다.
- **MUST** 도메인은 단위 테스트한다.

### 9.3 제외 / 금지
- **MUST NOT** 단순 위임만 하는 Controller는 별도 테스트하지 않는다 (같은 것을 두 번 검증함).
- **MUST NOT** 이미 검증된 메서드를 다시 검증하지 않는다. 새 로직이 있을 때만 추가한다.
- **MUST** Controller 테스트는 최대한 하지 않는다. Controller에는 로직을 최소화한다.

### 9.4 외부 의존 & mock
- **SHOULD** DB·HTTP 등 외부 의존이 포함되면 mock을 고려한다.
  - 이유: 네트워크 불안정에 영향받지 않고 내부 핵심 로직만 격리해 빠르게 검증.
- **MUST** 단위 테스트 비중을 높이되, **mock·fake를 남발하지 않는다**.

### 9.5 테스트가 보호하는 것
- 내부 코드가 변경·리팩터링되어도, 각 계층(Controller / Service·Domain / Repository)의 역할과 책임이 약속된 동작을 수행하는지 검증해 **기존 요구사항이 깨지지 않도록** 보호한다.

---

## 10. 도메인 작성 기준 (요약)

- **MUST** 도메인은 객체지향적으로, 변경에 용이하고 가독성 좋게, 의존성을 적절히 관리하며 작성한다.
- **MUST** 도메인은 단위 테스트한다.

---

## 부록 A. 리뷰 체크리스트 (하네스)

구현 후 아래를 통과하면 머지한다.

**스타일**
- [ ] indent depth ≤ 2
- [ ] 삼항 연산자 없음
- [ ] `else` / `switch`-`case` 없음
- [ ] 메서드 ≤ 20라인
- [ ] 축약·약어 없음, 이름이 의도를 드러냄

**객체지향**
- [ ] 의미 있는 원시값/문자열 포장, 배열 대신 컬렉션, 일급 컬렉션 사용
- [ ] 변경 여지 없는 상태는 불변
- [ ] "없음"을 null이 아닌 객체로 표현
- [ ] Tell, Don't Ask / 디미터 법칙 준수
- [ ] 외부가 내부 결정에 의존하지 않음(캡슐화)

**클래스/책임**
- [ ] 인스턴스 변수 ≤ 5, 엔티티가 작음
- [ ] 메서드 인자 ≤ 4
- [ ] 변경 이유가 다른 코드가 한 클래스에 섞이지 않음
- [ ] 한 변경이 3곳 이상에 퍼지지 않음

**공통 부분**
- [ ] 같은 타입 분기가 2곳 이상이면 다형성으로 전환됨
- [ ] 새 타입 추가 시 기존 코드 수정 불필요(OCP)

**계층/저장**
- [ ] 도메인이 Repository 인터페이스 너머만 의존
- [ ] Service 외 객체가 Repository를 모름
- [ ] 원자적 단위마다 즉시 영속화
- [ ] 부가 작업(알림/로그/통계)은 트랜잭션 밖

**예외**
- [ ] 커스텀 예외 + ProblemDetail + RestControllerAdvice 매핑
- [ ] 로그 위치 규칙 준수

**테스트**
- [ ] 도메인 단위 / Service·Repo 통합 / Controller E2E 배치 준수
- [ ] 단순 위임 Controller·이미 검증된 메서드 재검증 안 함
- [ ] mock/fake 남발 없음

---

## 부록 B. 우선순위 요약

1. **컨벤션/규칙** 위반부터 잡는다.
2. **역할 분리**(책임)를 정리한다.
3. **세부 로직**을 다듬는다.

> 인자 3개↑ → 객체로 묶기 · 분기 2곳↑ → 다형성 · 변경 3곳↑ → 책임 재분배.
> 이 세 트리거를 기억하면 대부분의 리팩터링 시점을 놓치지 않는다.

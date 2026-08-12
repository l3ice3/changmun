# testing.md — 테스트 규칙 (무엇을·어디까지·어떻게)

> **무엇을, 어디까지, 어떻게 테스트할지의 단일 진실.** 설계(`.claude/rules/rules-core.md`)·저장 경계(`persistence.md`)·계약(`docs/api-spec.md`·`docs/data-model.md`)과 함께 읽는다.
> 검증 전략의 **단일 진실은 `docs/AC.md`**다(자동 vs 수동, 앱별 범위). 이 문서는 그 위에 "어떻게 좋은 테스트를 쓰는가"를 얹는다.
> "지향"은 이 문서가, "강제"는 `.claude/hooks/`와 CI(`static-analysis.yml`)가 맡는다.

## 0. 검증 전략 (창문 확정 — AC.md 그대로)

| 앱 | 방식 | 도구 | 근거 |
|---|---|---|---|
| `apps/ingest` (수집·정규화·dedup·페르소나) | **자동 필수** | pytest. fixture는 **실제 API 응답 표본** 사용 | `.claude/rules/ingest.md`, AC-001~010 |
| `apps/api` (읽기 전용 서빙) | **자동 필수** | JUnit 5 + AssertJ. 산식·도메인=단위, Repository·API 흐름=**Testcontainers 실 PostgreSQL** | AC-011~021·023 |
| `apps/web` (Next.js) | **수동 절차** (AC에 명시된 절차) | E2E 자동화는 **Phase 2** — MVP에선 만들지 않음 | `.claude/rules/web.md`, AC.md |

> api는 실 PostgreSQL 통합이 기본이다(현재 13개 테스트 클래스). H2로 흉내내지 않는다 — `pg_trgm`·JSONB·배열 연산이 거짓 통과를 만든다(`.claude/rules/api.md §테스트`). CI에서도 Docker가 필요하다.

## 1. 테스트의 목적 — 회귀 보호

테스트가 지키는 것은 **"지금 옳다"가 아니라 "바꿔도 유지된다"** 는 회귀 안전성이다.

- 코드를 변경·리팩터링한다면, 기존 동작이 깨지지 않았음을 보장하는 테스트가 **먼저** 있어야 한다.
- 그래서 **"무엇을 테스트하지 않을지"**(4절)가 "무엇을 테스트할지"만큼 중요하다.
- 좋은 테스트 = 깨졌을 때 **무엇이 왜 깨졌는지 즉시** 알 수 있는 테스트.

## 2. 테스트 단위 — 행위(Behavior)

메서드 한 개당이 아니라 **도메인의 행위 하나당** 테스트 하나를 둔다. "이 객체가 어떤 결정을 내리는가"를 기준으로 자른다.

- `public` 메서드는 테스트한다(getter·단순 위임 제외). `private`는 따로 테스트하지 않는다 — 내부 구현을 노출하지 않는다.
- **형식: given–when–then.** 세 단계가 눈에 보이게 나눈다(pytest도 동일하게 구획).
- **`@DisplayName`은 한국어로 "행위·기대 결과"**를 적는다. 메서드명이 아니라 규칙을 쓴다.
  - 예: `@DisplayName("deadline이 오늘 이전이면 status는 CLOSED, dDay는 null이다")`
  - pytest: 테스트 함수명/docstring에 같은 규칙을 한글로.
- **하나의 테스트는 하나의 개념만** 검증한다. 단언이 여러 규칙에 걸치면 쪼갠다.
- **Java 단언은 AssertJ(`assertThat`)로 통일.** JUnit `assertEquals`를 섞지 않는다. 예외는 `assertThatThrownBy`.

### TDD: Red → Green → Refactor
도메인 로직과 핵심 정책(산식·dedup·멱등)은 가능하면 테스트를 **먼저** 쓴다.
1. **Red** — 구현 없이 요구사항(행위)을 검증하는 실패 테스트를 먼저.
2. **Green** — 통과시키는 가장 단순한 구현.
3. **Refactor** — 통과를 유지하며 중복 제거·가독성 개선.

## 3. 검증 수준 — 단위 / 슬라이스·통합 / E2E

| 수준 | 대상 | 창문에서 |
|---|---|---|
| 단위 | JVM/프로세스 안에서 닫히는 순수 로직(산식·상태 전이·점수 계산) | api: status/dDay/closingSoon/badges 산식, ingest: dedup 스코어·enum 정규화 |
| 슬라이스·통합 | 외부 의존(Spring·DB·HTTP)이 동작의 일부 | api: 컨트롤러/리포지토리 슬라이스, ingest: UPSERT 멱등 |
| E2E | 사용자 시나리오 전체 | web=수동, 전체 E2E 자동화=Phase 2 |

**수준을 정하는 순서:** ① 외부 의존 없이 표현 가능한가? → 단위 / ② 외부 의존과의 결합 자체가 동작인가? → 슬라이스·통합 / ③ 시나리오 전체 보호가 목적인가? → E2E.

피라미드를 지킨다: **단위 다수 → 슬라이스·통합 소수.** 모든 걸 무거운 `@SpringBootTest`로 검증하지 않는다.

## 4. 테스트하지 않는 것 (금지 — 통과해도 새로 보증되는 게 없음)

- **자체 로직이 없는 것** — getter/setter·생성자·`equals`/`hashCode`·단순 위임. 깨질 분기가 없고, 깨지면 컴파일러·IDE가 잡는다.
- **우리 소유가 아닌 것** — 프레임워크·라이브러리·외부 시스템 동작. `List.add()`·JPA·requests가 잘 도는지 검증하지 않는다. 우리가 볼 건 "그걸 올바르게 사용했는가"뿐.
- **이미 다른 테스트가 보증하는 것** — 하위에서 검증된 로직을 상위에서 재검증하지 않는다. 단, 그걸 **활용해 새 로직**(판별·집계)이 생기면 그 부분은 다시 검증한다.
- **단순 위임 Controller** — `.claude/rules/api.md`·`.claude/rules/rules-core.md`와 동일. 로직 없는 위임은 슬라이스/E2E에서 한 번만.
- **입출력(I/O) 자체** — 순수 계산 결과만 본다.

## 5. 실제 DB / Fake / Mock — 무엇을 언제 (사고 도구)

협력자를 무엇으로 대체할지는 **"검증 대상의 본질이 상태냐 상호작용이냐"** 로 가른다.

- **실제 DB** — 보호 대상이 DB 상태 그 자체(SQL·매핑·제약조건·실제 쓰기/읽기)일 때. SQL·매핑은 가짜로 재현 못 한다. 운영과 같은 방언(PostgreSQL)으로 본다. **창문 적용: `(source, external_id)` UNIQUE + UPSERT 멱등(AC-002), pg_trgm 부분일치(`q`)처럼 DB 동작이 곧 검증 대상인 경우.**
- **Fake (인메모리 Repository)** — DB가 협력자일 뿐이고 그 위 비즈니스 로직만 격리해 보고 싶을 때. Repository의 본질은 "호출됐다"가 아니라 **"저장·조회의 결과 상태"**다. `save`한 걸 `find`로 꺼내는 흐름은 상태를 가진 Fake라야 자연스럽다.
- **Mock** — 협력자가 **보관할 상태가 없는 통신**일 때. 외부 공식 API 호출(K-Startup·기업마당·온통청년)이 여기. `request→response` 한 번의 통신이므로 "어떤 호출이 어떤 인자로 일어났는가"를 검증한다.

**금지 — 영속성 계층(Repository/JDBC)을 Mock으로 단위 테스트하지 않는다.** 정작 봐야 할 SQL이 mock 뒤로 숨고, 상태 없는 mock은 `save→find` 흐름을 표현 못 한다. 결국 기대한 동작을 내가 다시 적어 넣는 자기충족 테스트가 된다.

## 6. 테스트가 어려우면 = 설계 신호

**테스트하기 어려운 코드는 설계가 잘못됐다는 신호다.** 억지로 끼워 맞추지 말고 대상을 리팩터링한다.

- **현재 시각·무작위에 의존하지 않는다.** status/dDay 산식은 "오늘" 날짜에 의존한다 → **기준일(또는 `Clock`)을 주입**해 시간을 고정하고 경계(`deadline == 오늘`, `dDay == 7`)를 본다. `LocalDate.now()` 직접 호출 금지.
- **외부 API 응답은 주입 가능한 경계 뒤에 둔다**(`sources/`). dedup·정규화 테스트가 실제 네트워크 호출에 의존하지 않게 한다(fixture=표본).
- 메서드가 2개 이상의 로직을 품어 테스트가 엉키면, 각 로직을 분리하고 각각 테스트한다.
- given이 길어지면 헬퍼/픽스처로 정리한다.

## 7. 반드시 테스트할 정책

**→ `AC.md`가 목록의 단일 진실이다.** 여기에 AC 번호를 복사해두면 AC가 바뀔 때 조용히 갈라진다 — 작업 중인 FR의 AC를 직접 읽어라.

판단 기준만: **계약(api-spec·data-model)이나 절대규칙이 걸린 동작은 예외 없이 자동 테스트를 붙인다.** 산식(status·dDay·closingSoon), 멱등성(UPSERT), 노출 범위(`is_canonical`), 입력 검증·바인딩, PII 부재가 여기 해당한다. "있으면 좋은 것"이 아니라 필수다.

## 8. 명세 준수 테스트

각 응답이 **`api-spec.md`·`data-model.md`와 일치하는가**를 검증한다(창문에는 openapi.yaml이 없다 — 마크다운 계약이 진실).

- 성공 응답의 **필드명(camelCase)·타입·필수 여부**가 api-spec과 일치한다.
- 에러는 **RFC7807 `ProblemDetail`**(`{type,title,status,detail,instance}` + 확장 `code`) 구조를 따른다. `code`: `INVALID_PARAM`(400)/`NOT_FOUND`(404)/`INTERNAL`(500) (`api-spec.md §0`).
- 상태코드와 `code`를 함께 본다.
- **명세가 코드보다 먼저 옳아야 한다.** 불일치는 코드를 고치거나, 근거가 있으면 계약 문서를 먼저 바꾼다(PRD·AC·data-model·api-spec 동기화 — `CLAUDE.md` 작업흐름 6).

## 9. "완료"의 정의

코드가 "됐다"는 건 다음을 모두 만족할 때다.
1. 도메인 로직과 핵심 정책 테스트가 통과한다(회귀 보호).
2. 응답이 `api-spec.md`·`data-model.md` 명세와 일치한다(명세 준수).
3. glossary(`glossary-dev.md`) 표준어를 따르고, 설계 규칙(`.claude/rules/rules-core.md`)에서 크게 벗어나지 않는다.
4. **AC 기준 자가 판정** Pass 근거 명시 + `AC.md §1` 상태 칸 같은 커밋에서 갱신 (`CLAUDE.md` 작업흐름 2·3).

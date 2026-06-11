# CLAUDE.md

창업 지원금 큐레이션 서비스 (가칭 "지원금 전담 비서").
예비·극초기 창업자·대학생에게 페르소나 탭으로 맞는 정부 지원금만 보여주는 서비스.

## 제1원칙
**스펙이 모호하거나 /docs와 충돌하면 — 구현하지 말고 멈춰서 질문한다.** 추측 구현 금지.

## 문서 맵 (작업 전 반드시 해당 문서 확인)
| 무엇을 할 때 | 보는 문서 |
|---|---|
| 기능 요구사항·엣지 케이스 | `docs/PRD.md` (FR-001~007) |
| 완료 판정 기준 | `docs/AC.md` (AC-001~027, DoD) |
| DB 스키마·소스 매핑·dedup | `docs/data-model.md` (**LOCKED** — 변경은 3인 합의 필수) |
| API 요청/응답 형식 | `docs/api-spec.md` (필드명·enum 임의 변경 금지) |
| 화면·배지·페르소나 탭 | `docs/screens.md` |
| 전략·가드레일·왜 | `docs/기획서-v2-통합본.md` |

## 레포 맵
```
/docs              계약 문서 (위 표)
/db/migrations     Flyway SQL — 스키마의 단일 진실. 스키마 변경은 여기에만
/apps/api          Spring Boot (Java, Gradle Kotlin DSL) — 읽기 전용 서빙 API
/apps/ingest       Python (poetry) — 수집·정규화·dedup 배치. 일 1회 실행
/apps/web          Next.js + TypeScript — SSG/ISR (SEO 핵심)
/.claude/rules     앱별 상세 규칙 (해당 앱 작업 시 필독)
```

## 절대 규칙 (위반 = 즉시 반려)
1. **스키마는 `/db/migrations` Flyway로만 변경.** Spring `ddl-auto=validate` 고정 — `update`/`create` 금지. ORM이 스키마를 만들지 않는다.
2. **`status` 컬럼 저장 금지** — 마감일 기준 조회 시 계산 (`api-spec.md` §0 산식이 유일한 정의).
3. **`raw` 컬럼은 원본 그대로** — 가공·요약해서 저장 금지.
4. **리스트/검색 서빙은 `is_canonical = true`만.** 예외는 `ids=` 조회뿐.
5. **API 필드명·enum·에러 형식은 `api-spec.md` 그대로.** camelCase. 프론트는 status·dDay·badges 재계산 금지(서버 값 렌더만).
6. **개인정보 수집 금지.** event_log는 익명 UUID + 화이트리스트 payload 키만.
7. **크롤링 라이브러리(Selenium 등) 도입 금지** (MVP). 수집은 공식 API 3종만: K-Startup(전량) / 기업마당(`searchLclasId=06`만) / 온통청년(`mclsfNm=창업`만).
8. **페르소나 억지 채움 금지** — 신호 없으면 `target_*` NULL(= "조건 미상").
9. **UI 카피에 "받을 수 있어요"류 합격 보장 표현 금지** — "신청 자격이 됩니다 / 합격 여부는 별개"가 기준 (가드레일 1).
10. **PRD Out-of-Scope 구현 금지**: 로그인·추천·알림·관리자 UI·민간 수집. 요청받지 않은 기능 추가 금지.

## 코딩 규칙 — apps/api (Java) 작업 시 MUST
> 전체 체계: `docs/rules/README.md` · 상세·이유·예시: `docs/rules/rules-full.md` (작업 종류별 해당 섹션만 발췌 참조)
> 아래는 상시 규칙(core = `docs/rules/rules-core.md`). 커밋 전 `./gradlew check` (checkstyle+pmd+test) 통과 필수 — 실패 시 PR 머지 불가.

### 스타일
- indent depth ≤ 2 / 메서드 ≤ 20라인 / 메서드 인자 ≤ 4
- `else`·`switch`-`case`·삼항 연산자 금지 → early return으로 평탄화
- 축약·약어 금지. 이름은 의도를 드러낸다(길어지면 책임 과다 신호)

### 객체지향
- Tell, Don't Ask — 데이터를 꺼내 판단하지 말고 객체에 묻는다
- 디미터 법칙 — `a.getB().getC()` 체이닝 금지
- 배열 대신 컬렉션 / 일급 컬렉션 / 변경 여지 없는 상태는 불변
- "없음"을 null로 표현하지 않고 별도 객체로
- 인스턴스 변수 ≤ 5, 변경 이유가 다르면 클래스 분리

### 리팩터링 트리거 (이 3개만 기억)
- 인자 3개↑ → 객체로 묶기 / 같은 타입 분기 2곳↑ → 다형성 전환 / 한 변경이 3곳↑ 전파 → 책임 재분배

### 계층 (ArchUnit이 자동 검사 — `apps/api/src/test/.../ArchitectureTest.java`)
- 도메인은 Repository 인터페이스 너머만 의존 / Service 외 객체는 Repository를 모른다 / Controller는 위임만

### 테스트
- TDD. 도메인=단위 / Service·Repo=통합 / Controller=E2E. 단순 위임 Controller·이미 검증된 메서드는 재검증 안 함. mock/fake 남발 금지

## 작업 흐름
1. 작업 = FR 단위. 시작 전 해당 FR(PRD) + 연결 AC(AC.md) + 앱 규칙(.claude/rules/) 읽기.
2. 구현 후 **AC 기준 자가 판정** — Pass 근거를 명시하고 완료 선언.
3. 테스트: `apps/ingest` = pytest 필수 / `apps/api` = Spring 테스트 필수 / `apps/web` = AC의 수동 절차 명시 (E2E 자동화 금지 — Phase 2).
4. 커밋 단위 = FR 또는 AC 단위로 작게.

## 명령어
```bash
# api
cd apps/api && ./gradlew bootRun        # 실행
cd apps/api && ./gradlew test           # 테스트
# ingest
cd apps/ingest && poetry install && poetry run python -m ingest   # 수집 실행
cd apps/ingest && poetry run pytest     # 테스트
# web
cd apps/web && pnpm dev                 # 개발 서버
cd apps/web && pnpm build               # SSG/ISR 빌드 검증
# db
# 마이그레이션은 apps/api Flyway가 /db/migrations를 바라봄 (스키마 변경 = SQL 파일 추가만)
```

## 환경
- DB: PostgreSQL (JSONB, pg_trgm 필수). 로컬은 docker compose.
- API 키(K-Startup·기업마당·온통청년)는 환경변수 — 코드·레포 커밋 절대 금지.
- 배포: AWS 단일 통합 (RDS + EC2/ECS + 배치 스케줄).

# CLAUDE.md

창업 지원금 큐레이션 서비스 (가칭 "지원금 전담 비서").
예비·극초기 창업자·대학생에게 페르소나 탭으로 맞는 정부 지원금만 보여주는 서비스.

## 제1원칙
**스펙이 모호하거나 /docs와 충돌하면 — 구현하지 말고 멈춰서 질문한다.** 추측 구현 금지.

## 문서 맵 (작업 전 반드시 해당 문서 확인)
| 무엇을 할 때 | 보는 문서 |
|---|---|
| 기능 요구사항·엣지 케이스 | `docs/PRD.md` (FR-001~011) |
| 완료 판정 기준 | `docs/AC.md` (AC-001~045, CC-01~07, Phase 1·2 DoD) |
| DB 스키마·소스 매핑·dedup | `docs/data-model.md` (**LOCKED** — 변경은 3인 합의 필수. §2는 **v2 개정안 심의 중** — 합의 전까지 운영 진실은 `/db/migrations`의 v1) |
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
/.claude/rules     앱별 규칙 + apps/api 코딩 규칙(rules-core) — path-scoped 자동 로드(해당 앱 파일 작업 시)
```

## 절대 규칙 (위반 = 즉시 반려)
1. **스키마는 `/db/migrations` Flyway로만 변경.** Spring `ddl-auto=validate` 고정 — `update`/`create` 금지. ORM이 스키마를 만들지 않는다.
2. **`status` 컬럼 저장 금지** — 마감일 기준 조회 시 계산 (`api-spec.md` §0 산식이 유일한 정의).
3. **`raw` 컬럼은 원본 그대로** — 가공·요약해서 저장 금지. (민간 소스는 본문 전문을 애초 수집하지 않음 — 사실 필드만, data-model §6-F)
4. **리스트/검색 서빙은 `is_canonical = true`만.** 예외는 `ids=` 조회뿐. **민간 소스는 추가로 `review_status='approved'`만** — pending·rejected는 `ids=`·`stats` 집계·상세의 `otherSources` 포함 전 경로 미노출(FR-011). ▸ **v2 이관 후에는 최상위 전 경로가 `opportunity.is_visible` 하나(예외 없음)**, 상세의 `otherSources`만 `source_record.is_publishable`이다 — data-model §2-D의 이관 목록이 이 문장도 대상으로 잡고 있다.
5. **API 필드명·enum·에러 형식은 `api-spec.md` 그대로.** camelCase. 프론트는 status·dDay·badges 재계산 금지(서버 값 렌더만).
6. **개인정보 최소 수집.** 비로그인·event_log 경로는 **익명 유지**(익명 UUID + 화이트리스트 payload 키만, PII 금지). 로그인(`app_user`)만 예외 — **이메일·provider 식별만** 저장(토큰·프로필 미저장) + 개인정보처리방침 필수.
7. **수집은 공식 API 3종 + 민간 화이트리스트 Tier 1만**(FR-011, 2026-07-26 개정). 공공: K-Startup(전량) / 기업마당(`searchLclasId=06`만) / 온통청년(`mclsfNm=창업`만). 민간: data-model 소스 레지스트리의 화이트리스트를 **정적 기술(requests·BeautifulSoup4·feedparser)로만** + robots·UA·딜레이 예절 의무. **헤드리스 브라우저(Selenium·Playwright)·봇 차단 우회·로그인 영역 수집·전수 크롤링·집계 사이트 크롤링 금지.** 신규 소스 편입 = 체크리스트 + 3인 합의.
8. **페르소나 억지 채움 금지** — 신호 없으면 `target_*` NULL(= "조건 미상").
9. **UI 카피에 "받을 수 있어요"류 합격 보장 표현 금지** — "신청 자격이 됩니다 / 합격 여부는 별개"가 기준 (가드레일 1).
10. **PRD Out-of-Scope 구현 금지**: 추천·알림·관리자 UI. 요청받지 않은 기능 추가 금지. (로그인·민간 수집(FR-011 하이브리드)은 In-Scope로 확장됨 — 팀 3인 합의, PRD §3.1. 민간 검수는 CLI 스크립트 — 웹 검수 화면은 관리자 UI라 계속 금지)

## 코딩 규칙 (앱별 — path-scoped 자동 로드)
> 앱 규칙은 해당 앱 파일을 만질 때만 자동 로드된다(중복 기재·항상 주입 안 함). **자동 로드는 매칭 파일을 열 때 트리거되므로, 새 파일 생성 등 기존 파일을 먼저 읽지 않는 작업에선 안 실릴 수 있다 → 해당 앱 작업을 시작하기 전에 아래 규칙 파일을 직접 읽어라(작업 흐름 §1).**
> - **apps/api(Java)**: `.claude/rules/rules-core.md`(상시 코딩 압축본) + `.claude/rules/api.md`(구조·정답 코드 예시) → 깊은 참조 라우팅은 `rules-core.md` 상단을 따른다. 커밋 전 `cd apps/api && ./gradlew check` 통과 필수.
> - **apps/ingest(Python)**: `.claude/rules/ingest.md` · **apps/web(TS)**: `.claude/rules/web.md`
> 전체 규칙 체계·강제 3계층: `docs/rules/README.md`. 로컬 hook: `.claude/hooks/README.md`.

## 작업 흐름
1. 작업 = FR 단위. 시작 전 해당 FR(PRD) + 연결 AC(AC.md) + 앱 규칙(.claude/rules/) 읽기.
2. 구현 후 **AC 기준 자가 판정** — Pass 근거를 명시하고 완료 선언.
3. 완료 선언 시 **`AC.md` §1 매핑 테이블의 상태 칸을 같은 커밋에서 갱신** (문서 부패 방지 최소 장치).
4. 테스트: `apps/ingest` = pytest 필수 / `apps/api` = Spring 슬라이스 테스트 필수 / `apps/web` = AC의 수동 절차 명시 (E2E 자동화 금지 — Phase 2). 상세 전략·기법은 `docs/rules/testing.md`.
5. 커밋 단위 = FR 또는 AC 단위로 작게. 브랜치·커밋·PR·머지 흐름은 `docs/rules/git.md` (Flyway 타임스탬프 버전명 포함). 코드 식별자 표준어는 `docs/rules/glossary-dev.md`.
6. **살아있는 계약 4개(PRD·AC·data-model·api-spec)와 코드가 어긋나면 즉시 동기화.** 그 외 문서는 갱신 의무 없음 (README 유지보수 정책).

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
- 배포: 하이브리드 — web=Vercel, api+DB=EC2 단일 인스턴스(Postgres 컨테이너·Caddy 자동 HTTPS). Python 배치=EC2 cron. RDS 대신 EC2 Postgres(비용 최소화, MVP) — pg_dump 백업(로컬+S3)으로 DR 보완, 확장 시 RDS·통합 이전 검토. 도메인 changmun.com(Cloudflare).
- **`main` 머지 = 프로덕션 자동배포**(api: GitHub Actions→GHCR 이미지→EC2 cron pull, web: Vercel). 조율 필요한 변경(마이그레이션·breaking change)은 머지 타이밍 주의 — 머지 즉시 라이브. 상세: `deploy/README.md`.

# 창문 (changmun) — 프로젝트 문서

예비·극초기 창업자·대학생을 위한 정부 창업 지원금 큐레이션 서비스.
페르소나 탭으로 "내 단계에 맞는 정부 지원금만" 가입 없이 골라 보여준다.

## 문서 맵
| 문서 | 역할 |
|---|---|
| `docs/기획서-v2-통합본.md` | 전략·가드레일·소스 결정 (왜) |
| `docs/PRD.md` | 요구사항 (FR 7 + Non-Goals + 기술제약) |
| `docs/AC.md` | 인수 기준 27개 + DoD (완료 판정) |
| `docs/data-model.md` | DB 스키마(LOCKED) + 3소스 매핑 + dedup 설계 |
| `docs/data-overview.md` | 데이터 큰 그림 (팀원용 개요) |
| `docs/screens.md` | 화면 4종 + 페르소나 4탭 + 배지 규칙 |
| `docs/DESIGN.md` | 디자인 시스템(색·타이포·로고·모션·grain) — 코드 주석이 참조 |
| `docs/api-spec.md` | API 5 엔드포인트 계약 |
| `CLAUDE.md` | Claude Code용 가드레일 + Java 코딩 규칙 core |
| `.claude/rules/` | 앱별 상세 규칙 (ingest/api/web) |
| `docs/rules/` | 코딩 규칙 시스템 (core/full/review-bot — 체계는 `docs/rules/README.md`) |
| `apps/api/config/` | Checkstyle·PMD 설정 — `build.gradle.kts`의 check 태스크에 연결 (A그룹 자동 차단) |
| `apps/api/src/test/.../ArchitectureTest.java` | ArchUnit 계층 의존 검사 (`com.changmun` 기준) |
| `.github/workflows/` | static-analysis(하드 게이트). 소프트 리뷰는 Codex 클라우드(워크플로 아님) |

## 문서 유지보수 정책
**갱신 의무가 있는 살아있는 계약은 4개뿐**: `PRD.md` · `AC.md`(매핑 테이블 상태 포함) · `data-model.md` · `api-spec.md`.
코드와 이 4개가 어긋나면 즉시 고친다(스키마·API 변경 시 같은 커밋에서). 나머지 문서(기획서·screens·rules-full 등)는
참고용 — 틀려도 구현을 막지 않으며 갱신 의무 없음. 코딩 규칙은 `.claude/rules/*`(앱별 path-scoped 자동 로드) + `docs/rules/`(참조 라이브러리).

## 읽는 순서 (처음 보는 사람)
기획서 → PRD → data-model → data-overview → screens → api-spec → AC

## 구현 현황 (2026-06 · 1차 QA 완료)
백엔드 FR-001~007 + 프론트 S1~S4 + UI/UX 폴리시까지 반영된 상태. 남은 건 기업마당(bizinfo) 수집기와 실 API 키·배포.

### `apps/api` — 읽기 전용 서빙 API (Spring Boot 4.1 · Java 21 · Gradle Kotlin DSL)
엔드포인트 5종:
| 메서드 · 경로 | 역할 |
|---|---|
| `GET /api/v1/opportunities` | 리스트/검색/찜(`ids=`) — `persona`·`region`·`category`·`source`·`status`·`q`·`sort`·`page` 필터 |
| `GET /api/v1/opportunities/stats` | 홈 지표 — 진행 중·오늘 뜬·마감임박 공고 수(canonical, 단일 스냅샷 집계) |
| `GET /api/v1/opportunities/{id}` | 상세 — 자격·지원내용 + 용어풀이(`matchedTerms`) + 다른 출처(`otherSources`) |
| `GET /api/v1/glossary` | 용어 사전 전체 |
| `POST /api/v1/events` | 익명 행동 로그(payload 키 화이트리스트 — PII 차단) |

- 도메인 단위 패키지(`opportunity`/`glossary`/`event`/`common`), 불변 record 요청 바인딩(`@BindParam`), `status`·`dDay`·`closingSoon`·`badges`는 **서버 계산·미저장**(조회 시 산출).
- 리스트/검색은 `is_canonical = true` 고정(찜 `ids=`만 예외). 모든 입력은 파라미터 바인딩(문자열 조립 금지).
- 커밋 전 `./gradlew check`(spotless·checkstyle·pmd·ArchUnit·Testcontainers 슬라이스 테스트) 통과 필수.

### `apps/ingest` — 수집·정규화·dedup 배치 (Python · poetry)
- 수집: **K-Startup·온통청년 2종 구현**(기업마당/bizinfo 수집기는 예정). 공식 API만 사용 — 크롤링 라이브러리 금지(MVP).
- 정규화(taxonomy 매핑)·dedup·페르소나 부여 배치. `raw` 원본 보존, 분류 칸 보존, UNDATED canonical 우선.
- `poetry run pytest` 통과.

### `apps/web` — SSG/ISR 프론트 (Next.js 15 · React 19 · TypeScript · Tailwind v4)
화면 4종:
- **S1 홈**: 페르소나 4탭 · 필터(지역·분야 커스텀 드롭다운 + 마감 포함, 마감임박/최신 정렬) · 홈 지표 · 검색 팝업 · **출처별 둘러보기**(KS·기업마당·온통청년 탭) · 페이지네이션(`?page=N`).
- **S2 상세**: 자격·지원 내용 + 용어풀이 인라인 + 원문/신청 외부 링크. SSG/ISR(일 1회 재생성).
- **S3 검색** · **S4 찜**(localStorage, 시크릿 모드 폴백).
- 공통: **나이트(다크) 모드** 토글 · 사이드바/상단바 · 지중해 히어로 · 직행식 카드(소스 배지·해시태그·D-day 알약·책갈피) · 익명 이벤트 로깅(fire-and-forget).
- 서버 계산값(`status`·`dDay`·`badges`)은 **렌더만**(프론트 재계산 금지). `pnpm build`(SSG/ISR) 통과.

### `db/migrations` — Flyway (스키마의 단일 진실)
`V1`(opportunity) · `V2`(glossary·event_log) + `region` TEXT[] · `organization_type` TEXT · glossary seed. Spring은 `ddl-auto=validate` 고정(ORM이 스키마를 만들지 않음).

## 로컬 실행
```bash
docker compose up -d              # PostgreSQL 16 (changmun/changmun@localhost:5432/changmun)

cd apps/api && ./gradlew bootRun  # Flyway 자동 적용 + 8080 기동
cd apps/api && ./gradlew check    # 커밋 전 필수: spotless·checkstyle·pmd·ArchUnit·테스트

cd apps/ingest && poetry install && poetry run python -m ingest   # 수집 1회 실행
cd apps/ingest && poetry run pytest                                # 테스트

cd apps/web && pnpm install && pnpm dev     # 개발 서버(:3000)
cd apps/web && pnpm build                   # SSG/ISR 빌드 검증
```
- DB 접속은 환경변수로 덮어쓸 수 있다: `DB_URL`·`DB_USERNAME`·`DB_PASSWORD`(예: 5432가 점유됐을 때 `DB_URL=jdbc:postgresql://localhost:5433/changmun`).
- 웹이 바라보는 API 베이스는 `NEXT_PUBLIC_API_BASE`(기본 `http://localhost:8080/api/v1`).
- API 키(K-Startup·기업마당·온통청년)는 환경변수 — 코드·레포 커밋 금지.

## 개발 도구 설치 (1회)
- Java 21 · Docker · Python 3.11 · Node + pnpm(corepack)
- poetry: `pip install poetry` 또는 공식 installer
- PowerShell에서 pnpm이 실행 정책에 막히면: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

## 확정 / 미결정
- 로마자 표기: **changmun 확정** (Java 패키지 `com.changmun`, DB명 `changmun`).
- **기업마당(bizinfo) 수집기 미구현** — 추가 예정(현재 수집은 K-Startup·온통청년).
- API 키 3종 발급 — 실수집 전 필요(코드는 env 주입 준비됨).
- 배포: **하이브리드 완료** — web=Vercel(www.changmun.com), api+DB=EC2 단일(Postgres 컨테이너·Caddy HTTPS, api.changmun.com). DB는 pg_dump 백업(로컬+S3).
- GitHub: branch protection(`static-analysis` required) + Codex 클라우드 코드 리뷰 활성화.

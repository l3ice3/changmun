# 창문 (changmoon) — 프로젝트 문서

예비·극초기 창업자·대학생을 위한 정부 창업 지원금 큐레이션 서비스.

## 문서 맵
| 문서 | 역할 |
|---|---|
| `docs/기획서-v2-통합본.md` | 전략·가드레일·소스 결정 (왜) |
| `docs/PRD.md` | 요구사항 (FR 7 + Non-Goals + 기술제약) |
| `docs/AC.md` | 인수 기준 27개 + DoD (완료 판정) |
| `docs/data-model.md` | DB 스키마(LOCKED) + 3소스 매핑 + dedup 설계 |
| `docs/screens.md` | 화면 4종 + 페르소나 4탭 + 배지 규칙 |
| `docs/api-spec.md` | API 4 엔드포인트 계약 |
| `CLAUDE.md` | Claude Code용 가드레일 + Java 코딩 규칙 core |
| `.claude/rules/` | 앱별 상세 규칙 (ingest/api/web) |
| `docs/rules/` | 코딩 규칙 시스템 (core/full/review-bot — 체계는 `docs/rules/README.md`) |
| `apps/api/config/` | Checkstyle·PMD 설정 — `build.gradle.kts`의 check 태스크에 연결됨 (A그룹 자동 차단) |
| `apps/api/src/test/.../ArchitectureTest.java` | ArchUnit 계층 의존 검사 (`com.changmun` 기준) |
| `.github/workflows/` | static-analysis(하드 게이트) + codex-review(소프트 제안) |

## 문서 유지보수 정책
**갱신 의무가 있는 살아있는 계약은 4개뿐**: `PRD.md` · `AC.md`(매핑 테이블 상태 포함) · `data-model.md` · `api-spec.md`.
코드와 이 4개가 어긋나면 즉시 고친다(스키마·API 변경 시 같은 커밋에서). 나머지 문서(기획서·screens·rules-full 등)는
참고용 — 틀려도 구현을 막지 않으며 갱신 의무 없음. 코딩 규칙의 원본은 `docs/rules/rules-core.md`(CLAUDE.md는 사본).

## 읽는 순서 (처음 보는 사람)
기획서 → PRD → data-model → screens → api-spec → AC

## 상태
스캐폴딩 전부 완료 — 다음 작업 = **FR-001(수집)**.
- `db/migrations` V1(opportunity)·V2(glossary·event_log) — 로컬 PostgreSQL에 Flyway 적용 검증 완료
- `apps/api` Spring Boot 4.1 · Java 21 · Kotlin DSL — `./gradlew check`(checkstyle·pmd·ArchUnit) 통과
- `apps/ingest` poetry 골격(sources/normalize/dedup/persona) — pytest 스모크 통과
- `apps/web` Next.js 15 + TS + Tailwind 골격 — `pnpm install && pnpm build` 통과 (정적 프리렌더 확인)

## 로컬 실행
```bash
docker compose up -d            # PostgreSQL 16 (changmun/changmun@localhost:5432/changmun)
cd apps/api && ./gradlew bootRun  # Flyway 마이그레이션 자동 적용 + 8080 기동
cd apps/api && ./gradlew check    # 커밋 전 필수: checkstyle + pmd + ArchUnit/테스트
cd apps/ingest && poetry install && poetry run pytest
cd apps/web && pnpm install && pnpm dev
```

## 개발 도구 설치 (1회)
- Java 21 ✅ / Docker ✅ / Python 3.11 ✅ / Node 24 + pnpm ✅ (설치됨)
- poetry: `pip install poetry` 또는 공식 installer
- PowerShell에서 pnpm이 실행 정책에 막히면: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

## 확정 / 미결정
- 로마자 표기: **changmun 확정** (Java 패키지 `com.changmun`, DB명 `changmun`)
- API 키 3종 발급(K-Startup/기업마당/온통청년) — FR-001 실수집 전 필요
- GitHub: branch protection(`static-analysis` required) + `OPENAI_API_KEY` 시크릿(codex-review용)

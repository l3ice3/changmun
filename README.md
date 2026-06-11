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
| `apps/api/config/` + `apps/api/build.gradle.snippet` | Checkstyle·PMD 설정 + Gradle 연결 (A그룹 자동 차단) |
| `apps/api/src/test/.../ArchitectureTest.java` | ArchUnit 계층 의존 검사 (패키지명 확정 후 `com.example` 수정) |
| `.github/workflows/` | static-analysis(하드 게이트) + claude-review(소프트 제안) |

## 읽는 순서 (처음 보는 사람)
기획서 → PRD → data-model → screens → api-spec → AC

## 상태
기획·계약·가드레일 전부 확정. 다음 = 레포 스캐폴딩 → FR-001(수집) → FR-002(dedup) → API → 프론트.

## 미결정 (구현 안 막음)
- 로마자 표기: changmoon vs changmun (팀 협의 후 패키지·DB·도메인 고정)
- API 키 3종 발급(K-Startup/기업마당/온통청년)

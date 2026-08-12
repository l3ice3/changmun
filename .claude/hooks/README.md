# .claude/hooks — 로컬 에이전트 강제선

규칙을 **문서(지향)에만 두면 에이전트가 안 따를 수 있다.** hook으로 인코딩하면 제안이 **매번 실행되는 코드**가 된다. 종료 코드로 통과/차단을 정한다.

> ⚠️ hook은 현재 환경의 자격증명으로 **자동 실행**된다. 설치·수정 전 스크립트를 반드시 리뷰한다.

## 강제의 3계층 (창문)

| 계층 | 무엇 | 어디 |
|---|---|---|
| **지향** (판단용) | 코딩·테스트·저장·git·용어 규칙 | `docs/rules/` · `CLAUDE.md` · `AGENTS.md` |
| **셀 수 있는 강제** (하드 게이트) | api: Spotless·Checkstyle·PMD·ArchUnit / ingest: ruff·mypy·pytest(실DB) / web: eslint·tsc — PR 빨간불=머지 불가 | `.github/workflows/static-analysis.yml` (3-job) |
| **로컬 에이전트 강제** (보조선) | 아래 hook — 에이전트 작업 중 즉시 차단/피드백 | `.claude/settings.json` + 이 폴더 |

세 계층을 **물리적으로 분리**해야 둘 다 무뎌지지 않는다. hook은 CI를 대체하지 않는다 — CI가 본 게이트다.

## 거는 hook

| 이벤트 | 매처 | 스크립트 | 동작 |
|---|---|---|---|
| PreToolUse | `Bash` | `guard-protected-branch.sh` | 보호 브랜치(main 등)에서 **git commit/push/merge만** 차단(exit 2). 읽기·빌드·테스트는 허용. 근거: `git.md` 절대규칙 1 |
| PostToolUse | `Edit\|Write` | `guardrail-lint.sh` | 편집 파일에서 창문 절대규칙 위반 신호 검사 후 피드백(exit 2). `docs/`·`.claude/`는 제외(오탐 방지) |

- 종료 코드 **0=통과, 2=차단/피드백**.
- `guardrail-lint`가 현재 보는 것: 프론트 소스 `"받을 수 있"` 카피(AC-015), `ddl-auto` validate 외 값(절대규칙 1). 항목은 셀 수 있는 절대규칙이 늘면 보수적으로 추가한다.

## 켜기 / 끄기

- 기본 활성: `.claude/settings.json`이 커밋되어 팀 전원의 에이전트가 동일 hook을 공유한다.
- 일시 비활성: 본인 `.claude/settings.local.json`에서 덮어쓰거나 `command`를 `true`로 둔다.

> hook은 **로컬**만 막는다. 원격 차단은 ruleset `protect-main`이 맡는다 — main 직접 push 금지 + required check 3개(`static-analysis`·`ingest-check`·`web-check`). 로컬 hook + 원격 보호 = 이중.

## 의도적으로 안 거는 것

- **편집마다 `./gradlew spotlessApply`**(자동 포맷) hook은 걸지 않는다 — 편집마다 JVM 기동이라 느리다. 포맷은 **커밋 전 1회** 또는 pre-commit 훅으로(`git.md` 절대규칙 3).

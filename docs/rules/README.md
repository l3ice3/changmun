# 코딩 규칙 시스템 — 전체 구조

이 레포의 코딩 규칙은 **사람·AI가 읽는 문서**와 **기계가 실행하는 설정**으로 나뉜다.
하나는 판단용, 하나는 자동 차단용이다.

## 파일 지도

```
docs/rules/
  README.md              ← (이 파일) 전체 구조 안내
  rules-core.md          ← 상시 규칙 압축본. AI 매 요청 / 사람 빠른 참조
  rules-full.md          ← 상세·이유·예시. 작업 종류별 발췌 참조
  rules-review-bot.md    ← 봇 vs 사람 위임 경계 (A/B/C 분류)

CLAUDE.md                ← AI 에이전트가 항상 읽는 작업 지침 (core 기반)

apps/api/config/
  checkstyle.xml         ← A그룹: 라인/depth/인자/else·switch·삼항/네이밍
  pmd-ruleset.xml        ← A그룹: 필드 수/디미터 체이닝/복잡도

apps/api/src/test/.../ArchitectureTest.java  ← A그룹: 계층 의존 규칙 (ArchUnit)

apps/api/build.gradle.kts  ← 위 도구들이 check 태스크에 연결돼 있음 (snippet은 병합 후 삭제)

.github/workflows/
  static-analysis.yml    ← A그룹 자동 차단 (실패 시 PR 머지 불가)

(B/C그룹 LLM 리뷰는 Codex 클라우드 코드 리뷰로 수행 — 워크플로 아님,
 chatgpt.com/codex에서 레포 연결 + Code Review 활성화. 코멘트만, 차단 안 함)
```

## 동작 흐름

1. 개발자(또는 AI)가 `CLAUDE.md` / `rules-core.md` 를 보며 구현한다.
2. PR을 올리면 GitHub Actions가 두 갈래로 검사한다.
   - **static-analysis.yml** → 셀 수 있는 규칙 위반 시 **빨간불 = 머지 불가**.
   - **Codex 클라우드 코드 리뷰** → 설계·의미 문제를 **코멘트로 제안** (머지 막지 않음).
3. 사람 리뷰어는 B그룹(SRP, Tell-Don't-Ask 등)에 집중한다. 셀 수 있는 건 봇이 이미 잡았다.

## 왜 이렇게 나누는가

- `.md` 만으로는 PR을 자동 반려할 수 없다. 기계는 글을 강제하지 못한다.
- 의미 판단을 정적 분석에 넣으면 오탐이 쏟아져 신뢰를 잃는다 → LLM 리뷰는 "제안만".
- 자동 차단(하드 게이트)과 제안(소프트)을 **물리적으로 분리**해야 둘 다 무뎌지지 않는다.

## 도입 순서 (체크리스트)

- [x] `build.gradle.snippet` 내용을 실제 `apps/api/build.gradle.kts` 에 병합 (snippet은 병합 후 삭제)
- [x] `config/` 의 두 XML 배치 (`apps/api/config/`), ArchitectureTest 패키지를 `com.changmun` 으로 수정
- [x] `./gradlew check` 가 로컬에서 도는지 확인 (PMD 7 호환: ExcessiveClassLength → NcssCount 교체)
- [ ] Codex 클라우드 코드 리뷰 활성화 — chatgpt.com/codex에서 GitHub 연결 + 레포 Code Review 켜기 (ChatGPT 구독 사용, API 키 불필요)
- [x] 두 워크플로우를 `.github/workflows/` 에 배치 (static-analysis는 `apps/api` 기준으로 경로 조정)
- [ ] GitHub branch protection 에서 `static-analysis` job 을 required check 로 지정 (이래야 실제로 머지가 막힌다)

## 토큰/컨텍스트 관리

- AI에는 평소 `CLAUDE.md`(=core) 만 들어간다.
- 도메인·예외·테스트 등 특정 작업이 나올 때만 `rules-full.md` 해당 섹션을 추가한다.
- full 전체를 통째로 주입하지 않는다.
- 가지치기 기준: 리뷰봇 위반 로그로 자주 어기는 규칙만 core에 남기고,
  빼도 검증 결과가 안 변하는 규칙은 core에서 full로 내린다.

---
name: review-cycle
description: 열린 PR에 Codex 리뷰 요청→지적 반영→재요청 사이클을 통과할 때까지 자동으로 돌린다. 사용법 /review-cycle <PR번호>. PR 생성 후 리뷰 대응을 별도 세션에서 진행할 때 사용.
---

# Codex 리뷰 사이클 (창문 레포)

인자로 받은 PR 번호에 대해 **리뷰 요청 → 지적 확인 → 수정 → 커밋/푸시 → 재요청**을 통과할 때까지 반복한다.
이 스킬은 독립 세션에서 실행되는 것을 전제로, 필요한 맥락을 전부 담고 있다.

## 0. 준비

1. PR 정보 확인 후 **head 브랜치를 체크아웃**한다 (main에서 작업 금지 — 절대규칙).
2. `gh` CLI가 없다 — GitHub API는 캐시된 자격증명으로 직접 호출한다:
   ```bash
   token=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | grep '^password=' | cut -d= -f2)
   curl -s -H "Authorization: Bearer $token" https://api.github.com/repos/l3ice3/changmun/...
   ```
   PowerShell이면 `Invoke-RestMethod` + 같은 토큰. **토큰 값을 출력·로그에 남기지 말 것.**
3. 앱 규칙 로드: 수정 대상 앱의 `.claude/rules/*.md`를 먼저 읽는다 (CLAUDE.md 작업 흐름 §1).

## 1. 리뷰 요청

- 이슈 코멘트로 `@codex review`를 단다. 반영 커밋이 있으면 코멘트에 **반영 내역 요약 + 커밋 해시**를 함께 적는다.
- 최초 1회는 PR 오픈 시 자동 리뷰가 이미 달려 있을 수 있으니 기존 리뷰부터 확인한다.

## 2. 응답 감시 (핵심 함정)

Codex 응답은 **두 형태**로 온다 — 반드시 둘 다 확인:
- 정식 리뷰 객체: `GET /pulls/{n}/reviews` (인라인 지적 동반)
- **일반 이슈 코멘트**: `GET /issues/{n}/comments` — 통과 판정("Didn't find any major issues" + 덕담)이 이쪽으로 옴. 리뷰만 감시하면 통과를 놓친다.

폴링은 Monitor(60초 간격, 요청 시각 이후 codex 계정 항목 필터)로. 인라인 지적 본문은
`GET /pulls/{n}/comments`에서 가져오되, **이미 처리한 코멘트 id를 기억해 제외**한다.
응답은 보통 5~15분. 세션이 길어지면 감시가 끊길 수 있으니 재개 시 "마지막 요청 이후 도착분"부터 다시 확인한다.

## 3. 지적 처리 원칙

각 지적을 세 갈래로 분류한다:

1. **이 PR 스코프의 실결함** → 수정. 수정마다: 테스트 추가/갱신 → 전체 스위트 통과 확인 → 데이터 파이프라인이면 라이브 재실행으로 실측 확인 → 커밋.
2. **스코프 밖 / 다른 PR·제품 결정 사안** → 고치지 말고 **인라인 답변으로 근거를 소명**(데이터·기존 동작 인용) + 후속 작업으로 분리 기록. 소명이 타당하면 다음 라운드에서 통과된다.
3. **문서-코드 불일치 지적** → 진실인 쪽에 맞춘다. 계약 문서(PRD·AC·data-model·api-spec) 수정 시 data-model은 LOCKED — 커밋을 분리하고 PR 본문에 3인 합의 플래그.

- 라이브 데이터를 바꾸는 수정이면 **결과 건수·표본을 검수**하고 커밋 메시지에 수치를 남긴다.
- 같은 지적이 반복되면(반영했는데 또 옴) 소명 답변 후 "그 외 새 지적만 확인" 요청으로 전환.

## 4. 커밋·푸시

- 형식: `fix({scope}): [AI] Codex 리뷰 반영 — {요지}` + 본문에 왜/근거 + `Co-Authored-By: Claude ... <noreply@anthropic.com>`
- 커밋 전 해당 앱 테스트 필수: ingest=`poetry run pytest`(반드시 `apps/ingest`에서 실행 — cwd 주의) / api=`./gradlew check`.
- **주의**: ingest 실DB 테스트와 수집 배치를 동시에 돌리지 말 것(deadlock 실제 발생 사례).

## 5. 종료 조건

- 통과: 응답에 "Didn't find any major issues"가 오면 사이클 종료.
- 지적이 전부 3-2 유형(스코프 밖 소명)뿐이면: 답변 달고 최종 라운드 1회만 더 요청 → 새 지적 없으면 종료.
- **종료 보고**: 라운드별 지적↔처리 표 + 최종 테스트 수치 + 머지 시 확인 사항(LOCKED 합의 필요 여부, 머지 즉시 배포 영향)을 정리한다. 머지는 사람이 한다 — 절대 직접 머지하지 않는다.

## 참고 (이 레포 특성)

- `main` 머지 = 프로덕션 자동배포(api·web). ingest 배치는 수동 실행(cron 없음).
- poetry로 `python -c` 실행 시 stdout이 사라지는 경우가 있음 → 스크립트 파일로 저장 후 실행.
- `main.run(collectors={})`는 빈 dict가 falsy라 전체 배치가 돈다(k-startup 30분+) — 후처리만 돌리려면 단계 함수를 직접 호출.

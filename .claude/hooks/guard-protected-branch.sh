#!/usr/bin/env bash
# PreToolUse(Bash): 보호 브랜치에서 git commit/push/merge를 차단한다.
# 전체 Bash를 막지 않는다 — 읽기·빌드·테스트는 보호 브랜치에서도 허용한다.
# 근거: docs/rules/git.md 절대규칙 1(main 직접 커밋/푸시 금지). 원격 branch protection과 병행한다.
# exit 2 = 차단(에이전트에 재고 유도). exit 0 = 통과.
set -euo pipefail

PROTECTED_REGEX='^(main|master|develop|release-.*)$'
CURRENT="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"

# 보호 브랜치가 아니면 즉시 통과
[[ "$CURRENT" =~ $PROTECTED_REGEX ]] || exit 0

# stdin(hook 입력 JSON)에서 실행될 명령을 추출
INPUT="$(cat)"
CMD=""
if command -v python3 >/dev/null 2>&1; then
  CMD="$(printf '%s' "$INPUT" | python3 -c 'import sys,json
try:
    print(json.load(sys.stdin).get("tool_input",{}).get("command",""))
except Exception:
    pass' 2>/dev/null || echo '')"
fi
# 파싱 실패 시 원문 전체를 대상으로 검사(보수적)
[ -z "$CMD" ] && CMD="$INPUT"

# git commit / push / merge 만 차단 (status·log·diff·add·checkout 등은 허용)
if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+(commit|push|merge)\b'; then
  echo "보호 브랜치($CURRENT)에서 git commit/push/merge가 감지됐습니다." >&2
  echo "작업 브랜치를 만들어 진행하세요 — git checkout -b {타입}/{앱-간단설명}  (docs/rules/git.md)" >&2
  exit 2
fi

exit 0

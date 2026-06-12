#!/usr/bin/env bash
# PostToolUse(Edit|Write): 편집된 파일에서 창문 절대규칙 위반 신호를 검사한다.
# 하드 게이트가 아니라 에이전트에 즉시 피드백을 주는 보조 강제선이다(CI가 본 게이트).
# docs/ · .claude/ 는 검사하지 않는다 — 규칙·계약 문서가 금지 문구를 "예시"로 담아 오탐이 나기 때문.
# exit 2 = 위반 피드백(에이전트가 자가 수정), exit 0 = 통과.
set -euo pipefail

INPUT="$(cat)"
FILE=""
if command -v python3 >/dev/null 2>&1; then
  FILE="$(printf '%s' "$INPUT" | python3 -c 'import sys,json
try:
    print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))
except Exception:
    pass' 2>/dev/null || echo '')"
fi
[ -z "$FILE" ] && exit 0
[ -f "$FILE" ] || exit 0

# 규칙·계약 문서는 금지 문구를 예시로 담으므로 제외
case "$FILE" in
  */docs/*|*/.claude/*) exit 0 ;;
esac

violations=""

# 1) 카피 가드레일 (AC-015 · web.md 5) — 프론트 소스에 "받을 수 있" 금지
case "$FILE" in
  *apps/web/*)
    if grep -nq "받을 수 있" "$FILE"; then
      violations="$violations\n- [AC-015] 카피 가드레일: \"받을 수 있\"류 합격 보장 표현 금지 → \"신청 자격이 됩니다 / 합격 여부는 별개\"."
    fi
    ;;
esac

# 2) ddl-auto 고정 (절대규칙 1) — validate 외 금지
case "$FILE" in
  *apps/api/*application*.yml|*apps/api/*application*.yaml|*apps/api/*application*.properties)
    if grep -Eiq 'ddl-auto[[:space:]]*[:=][[:space:]]*(update|create|create-drop)' "$FILE"; then
      violations="$violations\n- [절대규칙1] ddl-auto는 validate 고정(update/create 금지). 스키마는 /db/migrations Flyway로만."
    fi
    ;;
esac

if [ -n "$violations" ]; then
  echo "창문 절대규칙 위반 신호 ($FILE):" >&2
  printf '%b\n' "$violations" >&2
  exit 2
fi

exit 0

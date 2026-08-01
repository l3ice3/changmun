// 창문 워드마크 v3 — 심플 레터링(QA #30). 색·그라데이션 없이 currentColor 단색:
// 색감은 왼쪽 WindowMark(로고)가 담당하고 글자는 조용하게 — "심플한데 로고 같게".
// '창'은 평범한 고딕 글자(점획 수직), '문'의 ㅁ만 창틀+창살 라인 창(배경·하늘 없음).
// 받침 글자 비례: ㅏ 세로획은 받침 위에서 끝난다(고딕 글꼴 구조).
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 100" className={className} role="img" aria-label="창문">
      <g
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* 창: ㅊ — 점획은 수직(평범한 글자꼴) */}
        <line x1="39" y1="5" x2="39" y2="14" />
        <line x1="16" y1="20" x2="60" y2="20" />
        <line x1="38" y1="23" x2="20" y2="42" />
        <line x1="38" y1="23" x2="56" y2="42" />
        {/* 창: ㅇ 받침 — 글자 블록 중앙 하단 */}
        <circle cx="47" cy="74" r="16.5" />
        {/* 창: ㅏ — 받침 글자라 세로획은 받침 위에서 끝난다 */}
        <line x1="82" y1="6" x2="82" y2="60" />
        <line x1="84" y1="33" x2="97" y2="33" />
        {/* 문: ㅜ */}
        <line x1="126" y1="54" x2="210" y2="54" />
        <line x1="168" y1="57" x2="168" y2="69" />
        {/* 문: ㄴ */}
        <path d="M 133 65 V 83 Q 133 90 140 90 H 205" />
      </g>
      {/* 문: ㅁ = 라인 창(창틀+창살만, 배경 없음 — QA #30) */}
      <g stroke="currentColor" strokeLinecap="round" fill="none">
        <line x1="168" y1="10" x2="168" y2="36" strokeWidth="5" />
        <line x1="134.5" y1="23" x2="201.5" y2="23" strokeWidth="5" />
        <rect x="130" y="6" width="76" height="34" rx="8.5" strokeWidth="8" />
      </g>
    </svg>
  );
}

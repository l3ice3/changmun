import { useId } from "react";

// 창문 워드마크 v4 — 마크(WindowMark v3)와 같은 메탈릭 광택 잉크 + ㅁ 오프셋 십자(QA #30 통일성).
// '창'은 평범한 고딕 글자(받침 글자 비례: ㅏ 세로획은 받침 위에서 끝), '문'의 ㅁ만
// 라인 창 — 창살 교차점은 마크와 같은 비율로 우상단 오프셋. 그라데이션 id는 useId,
// line 요소는 바운딩박스 0폭이라 userSpaceOnUse 좌표 고정(WindowMark와 동일 이유).
export function BrandWordmark({ className }: { className?: string }) {
  const uid = useId();
  const sheenId = `${uid}-sheen`;
  const ink = `url(#${sheenId})`;
  return (
    <svg viewBox="0 0 212 100" className={className} role="img" aria-label="창문">
      <defs>
        <linearGradient
          id={sheenId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="212"
          y2="100"
        >
          <stop offset="0" stopColor="#b3bcff" />
          <stop offset="0.28" stopColor="#6b78f0" />
          <stop offset="0.5" stopColor="#4650d8" />
          <stop offset="0.68" stopColor="#8d98fa" />
          <stop offset="1" stopColor="#3a46c4" />
        </linearGradient>
      </defs>
      <g
        stroke={ink}
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
        {/* 창: ㅇ 받침 — ㅊ과 ㅏ 사이 글자 전체의 중앙 축(좌측 쏠림 방지) */}
        <circle cx="51" cy="74" r="16.5" />
        {/* 창: ㅏ — 받침 글자라 세로획은 받침 위에서 끝난다 */}
        <line x1="82" y1="6" x2="82" y2="60" />
        <line x1="84" y1="33" x2="97" y2="33" />
        {/* 문: ㅜ — 가로폭 축소(84→74) */}
        <line x1="128" y1="54" x2="202" y2="54" />
        <line x1="165" y1="57" x2="165" y2="69" />
        {/* 문: ㄴ */}
        <path d="M 135 65 V 83 Q 135 90 142 90 H 197" />
      </g>
      {/* 문: ㅁ = 라인 창(폭 76→62) — 창살 교차점을 마크(v3)와 같은 비율로 우상단 오프셋 */}
      <g stroke={ink} strokeLinecap="round" fill="none">
        <line x1="170" y1="10" x2="170" y2="36" strokeWidth="5" />
        <line x1="138.5" y1="21" x2="191.5" y2="21" strokeWidth="5" />
        <rect x="134" y="6" width="62" height="34" rx="8.5" strokeWidth="8" />
      </g>
    </svg>
  );
}

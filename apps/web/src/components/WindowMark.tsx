import { useId } from "react";

// 창문 로고 v3 — "빛나는 창틀"(QA #30): 내부 채움 없이 라인만 남긴 심플 창.
// 십자 창살 변주 = 가로 창살을 위쪽 1/3(트랜섬)로 올려 건축적인 리듬을 준다.
// 프레임은 블루베리 메탈릭 광택 — 밝음→깊음→글린트→깊음 밴딩 + 안쪽 흰 베벨 라인으로
// 금속 테두리처럼 빛이 도는 느낌. 그라데이션 id는 useId(한 화면 다중 렌더 충돌 방지),
// line 요소는 바운딩박스가 0폭이라 전부 userSpaceOnUse 좌표 고정.
export function WindowMark({ className }: { className?: string }) {
  const uid = useId();
  const sheenId = `${uid}-sheen`;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient
          id={sheenId}
          gradientUnits="userSpaceOnUse"
          x1="21"
          y1="11"
          x2="79"
          y2="89"
        >
          <stop offset="0" stopColor="#b3bcff" />
          <stop offset="0.28" stopColor="#6b78f0" />
          <stop offset="0.5" stopColor="#4650d8" />
          <stop offset="0.68" stopColor="#8d98fa" />
          <stop offset="1" stopColor="#3a46c4" />
        </linearGradient>
      </defs>
      {/* 창살 변주 — 십자를 중심에서 우상단으로 살짝 비껴 비대칭 4분할(창 리듬).
          정중앙+세로 관통은 십자가로, 세로 하단만은 T로 오독 — 오프셋이 정답. */}
      <line
        x1="57.5"
        y1="17"
        x2="57.5"
        y2="83"
        stroke={`url(#${sheenId})`}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="27"
        y1="43.5"
        x2="73"
        y2="43.5"
        stroke={`url(#${sheenId})`}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* 프레임 + 안쪽 베벨 글린트(금속 광 한 줄) */}
      <rect
        x="24.6"
        y="14.6"
        width="50.8"
        height="70.8"
        rx="9.5"
        fill="none"
        stroke={`url(#${sheenId})`}
        strokeWidth="7.2"
      />
      <rect
        x="28.6"
        y="18.6"
        width="42.8"
        height="62.8"
        rx="6.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.4"
        strokeWidth="1.4"
      />
    </svg>
  );
}

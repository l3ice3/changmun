import { useId } from "react";

// 창문 로고 v2 — "새벽빛 창": 배경 박스 없이 창문 단독. 블루베리 그라데이션 프레임 +
// 창밖 새벽 하늘(딥블루→라벤더→핑크→피치). 브랜드 미션(밤에서 기회를 내다보는 창)을 담는다.
// 그라데이션 id는 useId — 한 화면에 여러 개 렌더돼도 충돌하지 않게.
export function WindowMark({ className }: { className?: string }) {
  const uid = useId();
  const frameId = `${uid}-frame`;
  const skyId = `${uid}-sky`;
  const shadeId = `${uid}-shade`;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        {/* line 요소는 바운딩박스가 0폭이라 기본 그라데이션이 렌더되지 않음 → userSpaceOnUse로 좌표 고정 */}
        <linearGradient
          id={frameId}
          gradientUnits="userSpaceOnUse"
          x1="21"
          y1="11"
          x2="79"
          y2="89"
        >
          <stop offset="0" stopColor="#8A96F9" />
          <stop offset="1" stopColor="#4C5AE2" />
        </linearGradient>
        <linearGradient
          id={skyId}
          gradientUnits="userSpaceOnUse"
          x1="50"
          y1="14.6"
          x2="50"
          y2="85.4"
        >
          <stop offset="0" stopColor="#5466EB" />
          <stop offset="0.42" stopColor="#8B8AF0" />
          <stop offset="0.62" stopColor="#CD9CD6" />
          <stop offset="0.78" stopColor="#F7AB7A" />
          <stop offset="1" stopColor="#FFCB8A" />
        </linearGradient>
        <linearGradient
          id={shadeId}
          gradientUnits="userSpaceOnUse"
          x1="50"
          y1="14.6"
          x2="50"
          y2="85.4"
        >
          <stop offset="0" stopColor="#181C46" stopOpacity="0.28" />
          <stop offset="0.2" stopColor="#181C46" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 창밖 새벽 하늘 + 상단 인너 섀도(프레임 뒤 깊이감) */}
      <rect x="24.6" y="14.6" width="50.8" height="70.8" rx="9" fill={`url(#${skyId})`} />
      <rect x="24.6" y="14.6" width="50.8" height="70.8" rx="9" fill={`url(#${shadeId})`} />
      {/* 프레임 + 창살 — 블루베리 빛깔 */}
      <line
        x1="50"
        y1="17"
        x2="50"
        y2="83"
        stroke={`url(#${frameId})`}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="27"
        y1="50"
        x2="73"
        y2="50"
        stroke={`url(#${frameId})`}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect
        x="24.6"
        y="14.6"
        width="50.8"
        height="70.8"
        rx="9.5"
        fill="none"
        stroke={`url(#${frameId})`}
        strokeWidth="7.2"
      />
    </svg>
  );
}

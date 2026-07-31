import { useId } from "react";

// 창문 워드마크 v2 — 전용 레터링(컨펌 시안 B). '문'의 ㅁ 자리가 곧 로고 창문
// (그라데이션 창틀 + 새벽 하늘, ㅜ 가로폭에 맞춘 와이드 창) — 글자 안에 마크 정체성을 녹인다.
// ㅊ은 六처럼 점획·가로·다리가 전부 연결되는 한자 구조 + ㅇ을 바짝 붙여 '창'이 한 글자로 읽히게.
// 잉크는 CSS 변수(--wm-ink-a/b, globals.css)로 라이트/다크 전환.
// tone="onDark"는 테마와 무관하게 항상 어두운 배경(로그인 히어로) 위 밝은 잉크 고정.
export function BrandWordmark({
  className,
  tone = "auto",
}: {
  className?: string;
  tone?: "auto" | "onDark";
}) {
  const uid = useId();
  const inkId = `${uid}-ink`;
  const skyId = `${uid}-sky`;
  const shadeId = `${uid}-shade`;
  const [inkA, inkB] =
    tone === "onDark" ? ["#a7b1ff", "#7b87f5"] : ["var(--wm-ink-a)", "var(--wm-ink-b)"];
  const ink = `url(#${inkId})`;
  return (
    <svg viewBox="0 0 220 100" className={className} role="img" aria-label="창문">
      <defs>
        {/* line은 바운딩박스 0폭 — 그라데이션은 전부 userSpaceOnUse 좌표 고정(WindowMark와 동일 이유) */}
        <linearGradient id={inkId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="220" y2="100">
          <stop offset="0" stopColor={inkA} />
          <stop offset="1" stopColor={inkB} />
        </linearGradient>
        <linearGradient id={skyId} gradientUnits="userSpaceOnUse" x1="168" y1="6" x2="168" y2="40">
          <stop offset="0" stopColor="#5466EB" />
          <stop offset="0.42" stopColor="#8B8AF0" />
          <stop offset="0.62" stopColor="#CD9CD6" />
          <stop offset="0.78" stopColor="#F7AB7A" />
          <stop offset="1" stopColor="#FFCB8A" />
        </linearGradient>
        <linearGradient id={shadeId} gradientUnits="userSpaceOnUse" x1="168" y1="6" x2="168" y2="40">
          <stop offset="0" stopColor="#181C46" stopOpacity="0.26" />
          <stop offset="0.24" stopColor="#181C46" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke={ink} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* 창: ㅊ — 점획·가로·다리 연결(六 구조). 다리가 바보다 넓게 퍼지는 게 ㅊ의 시그니처 */}
        <line x1="40" y1="6" x2="40" y2="16" />
        <line x1="20" y1="22" x2="60" y2="22" />
        <line x1="40" y1="22" x2="17" y2="43" />
        <line x1="40" y1="22" x2="63" y2="43" />
        {/* 창: ㅇ — 받침은 ㅊ 밑이 아니라 글자 블록 중앙 축에(받침으로 읽히게) */}
        <circle cx="48" cy="68" r="17.5" />
        {/* 창: ㅏ */}
        <line x1="84" y1="6" x2="84" y2="94" />
        <line x1="86" y1="50" x2="99" y2="50" />
        {/* 문: ㅜ */}
        <line x1="126" y1="54" x2="210" y2="54" />
        <line x1="168" y1="57" x2="168" y2="69" />
        {/* 문: ㄴ */}
        <path d="M 133 65 V 83 Q 133 90 140 90 H 205" />
      </g>
      {/* 문: ㅁ = 와이드 창문(새벽 하늘 + 상단 인너 섀도) */}
      <rect x="130" y="6" width="76" height="34" rx="8" fill={`url(#${skyId})`} />
      <rect x="130" y="6" width="76" height="34" rx="8" fill={`url(#${shadeId})`} />
      <g stroke={ink} strokeLinecap="round" fill="none">
        <line x1="168" y1="10" x2="168" y2="36" strokeWidth="5" />
        <line x1="134.5" y1="23" x2="201.5" y2="23" strokeWidth="5" />
        <rect x="130" y="6" width="76" height="34" rx="8.5" strokeWidth="8" />
      </g>
    </svg>
  );
}

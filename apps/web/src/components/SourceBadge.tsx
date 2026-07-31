import { useId } from "react";
import { sourceLabel } from "@/lib/labels";

// 수집 소스(3종)의 공식 로고를 카드 타일 크기에 맞게 튜닝한 SVG 마크(QA #29).
// 원본을 그대로 쓰면 작은 타일에서 슬로건·보조 텍스트가 뭉개져 시그니처 요소만 남긴다:
// K-Startup = K + 태극 스월 / 기업마당 = 'Biz info' 돋보기 / 온통청년 = 그라데이션 라인 레터링.
// 타일 배경은 원본 로고와 같은 흰색 고정 — 브랜드 원본 보존 목적이라 다크 모드에서도 흰 타일.

function KStartupMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-full w-full">
      <text
        x="7"
        y="34"
        fontSize="27"
        fontWeight="900"
        fill="#101013"
        fontFamily="inherit"
      >
        K
      </text>
      {/* 태극 스월 — 상단 크림슨 + 하단 네이비 음양 형태(공식 로고 단순화) */}
      <g transform="rotate(-40 32 21)">
        <circle cx="32" cy="21" r="9.5" fill="#d0195e" />
        <path
          d="M32 11.5 a9.5 9.5 0 0 1 0 19 a4.75 4.75 0 0 1 0 -9.5 a4.75 4.75 0 0 0 0 -9.5 z"
          fill="#123c77"
        />
      </g>
    </svg>
  );
}

function BizinfoMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-full w-full">
      {/* Biz info 돋보기 — 공식 클린 로고의 시그니처 */}
      <line x1="15" y1="31" x2="8.5" y2="39" stroke="#e60012" strokeWidth="6" strokeLinecap="round" />
      <circle cx="27" cy="20" r="13.5" fill="#e60012" />
      <text x="27" y="19.5" fontSize="10" fontWeight="800" fill="#ffffff" textAnchor="middle" fontFamily="inherit">
        Biz
      </text>
      <text x="27" y="28.5" fontSize="7.5" fontWeight="700" fill="#ffffff" textAnchor="middle" fontFamily="inherit">
        info
      </text>
    </svg>
  );
}

function OntongMark() {
  const uid = useId();
  const gradId = `${uid}-ontong`;
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-full w-full">
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="4" y1="26" x2="44" y2="38">
          <stop offset="0" stopColor="#eb9db4" />
          <stop offset="0.5" stopColor="#a394dd" />
          <stop offset="1" stopColor="#8fc0dc" />
        </linearGradient>
      </defs>
      {/* 계단식 레터링 + 관통하는 그라데이션 라인(공식 클린 로고 단순화) */}
      <text x="4" y="21" fontSize="15.5" fontWeight="800" fill="#454549" fontFamily="inherit">
        온통
      </text>
      <polyline
        points="4,26 24,26 42,37"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="16" y="43" fontSize="15.5" fontWeight="800" fill="#454549" fontFamily="inherit">
        청년
      </text>
    </svg>
  );
}

const SOURCE_MARK: Record<string, () => React.ReactNode> = {
  "k-startup": KStartupMark,
  bizinfo: BizinfoMark,
  "ontong-youth": OntongMark,
};

const SIZE_CLASS = {
  sm: "h-6 w-6 rounded-[7px] p-[2px] text-[10px]",
  md: "h-11 w-11 rounded-[12px] p-[4px] text-[14px]",
};

export function SourceBadge({ source, size = "md" }: { source: string; size?: "sm" | "md" }) {
  const Mark = SOURCE_MARK[source];
  return (
    <span
      aria-label={sourceLabel(source)}
      className={`grid shrink-0 place-items-center overflow-hidden bg-white font-bold leading-none tracking-tight ring-1 ring-black/10 ${SIZE_CLASS[size]}`}
    >
      {Mark ? (
        <Mark />
      ) : (
        <span className="text-accent">{source.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

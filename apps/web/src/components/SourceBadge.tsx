import type { CSSProperties } from "react";
import { sourceLabel } from "@/lib/labels";

// 수집 소스(3종)를 나타내는 브랜드 배지 — 기업 로고를 못 넣는 대신 출처를 시각화.
// 공식 로고 파일이 준비되면 mark.text 대신 <img src="/sources/{source}.svg">로 교체 가능.
const SOURCE_MARK: Record<string, { text: string; style: CSSProperties }> = {
  "k-startup": { text: "KS", style: { background: "#13235b", color: "#ffffff" } },
  bizinfo: { text: "기업", style: { background: "#e1492b", color: "#ffffff" } },
  "ontong-youth": {
    text: "온통",
    style: { background: "linear-gradient(135deg, #7b6cf0, #5a8df0, #3fe0ab)", color: "#ffffff" },
  },
};

const SIZE_CLASS = {
  sm: "h-6 w-6 rounded-[7px] text-[10px]",
  md: "h-11 w-11 rounded-[12px] text-[14px]",
};

export function SourceBadge({ source, size = "md" }: { source: string; size?: "sm" | "md" }) {
  const mark = SOURCE_MARK[source] ?? {
    text: source.slice(0, 2).toUpperCase(),
    style: { background: "var(--color-surface-blue)", color: "var(--color-accent)" },
  };
  return (
    <span
      aria-label={sourceLabel(source)}
      style={mark.style}
      className={`grid shrink-0 place-items-center font-bold leading-none tracking-tight ${SIZE_CLASS[size]}`}
    >
      {mark.text}
    </span>
  );
}

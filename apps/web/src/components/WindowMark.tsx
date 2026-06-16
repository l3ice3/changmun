// 창문 로고 — 딥 블루베리 네이비 창(窓)이자 창업의 문(門). 브랜드 마크 (DESIGN.md §4).
export function WindowMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <rect x="2" y="2" width="24" height="24" rx="7" fill="var(--color-hero)" />
      <rect
        x="8"
        y="6.5"
        width="12"
        height="15"
        rx="2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.6"
      />
      <line x1="14" y1="6.5" x2="14" y2="21.5" stroke="#ffffff" strokeWidth="1.6" />
      <line x1="8" y1="13" x2="20" y2="13" stroke="#ffffff" strokeWidth="1.6" />
    </svg>
  );
}

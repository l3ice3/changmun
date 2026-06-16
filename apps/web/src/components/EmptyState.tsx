import Link from "next/link";

interface Props {
  title: string;
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
}

// 빈 상태 — 안내 문구 + 다음 행동 유도 (CC-02, FR-003/005/006).
export function EmptyState({ title, message, ctaHref, ctaLabel }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line bg-bg-alt px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-blue text-accent">
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="16" y1="16" x2="20" y2="20" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
      <p className="mt-4 text-[15px] font-medium text-ink">{title}</p>
      <p className="mt-1 text-[13px] text-muted">{message}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="press mt-5 rounded-lg bg-surface-blue px-4 py-2 text-[13px] font-medium text-accent"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

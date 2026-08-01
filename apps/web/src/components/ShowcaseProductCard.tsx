import Link from "next/link";
import {
  SHOWCASE_CATEGORY_LABELS,
  showcaseImageUrl,
  type ShowcaseCard,
} from "@/lib/showcase";

// 쇼케이스 카드 — 리스트·주간 모아보기 공용. 공고 카드와 구분되는 지면(전용 배지 톤).
export function ShowcaseProductCard({ item }: { item: ShowcaseCard }) {
  return (
    <Link
      href={`/showcase/${item.id}`}
      className="press flex flex-col rounded-[14px] border border-line bg-bg p-4 hover:border-edge"
    >
      <div className="flex items-center gap-3">
        {item.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={showcaseImageUrl(item.id)}
            alt=""
            className="h-11 w-11 shrink-0 rounded-[12px] border border-hair object-cover"
          />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-surface-blue text-[16px] font-bold text-accent">
            {item.name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{item.name}</p>
          <p className="text-[12px] text-muted">{item.makerName}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-secondary">
        {item.tagline}
      </p>
      <div className="mt-3 flex items-center gap-2 text-[12px]">
        <span className="rounded-md bg-violet-soft px-2 py-0.5 font-medium text-violet">
          {SHOWCASE_CATEGORY_LABELS[item.category]}
        </span>
        <span className="tnum ml-auto font-medium text-accent">응원 {item.cheers}</span>
      </div>
    </Link>
  );
}

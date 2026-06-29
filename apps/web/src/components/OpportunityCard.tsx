import Link from "next/link";
import type { BadgeCode, OpportunityCard as Card } from "@/lib/api";
import { BADGE_LABELS, sourceLabel } from "@/lib/labels";
import { BookmarkButton } from "./BookmarkButton";
import { DDay } from "./DDay";
import { SourceBadge } from "./SourceBadge";

// D-day 알약이 이미 보여주는 배지는 해시태그에서 제외(중복 방지).
const DDAY_BADGES: BadgeCode[] = ["CLOSING_SOON", "ALWAYS_OPEN"];

function hashtags(item: Card): string[] {
  const tags: string[] = [];
  if (item.category) tags.push(item.category);
  for (const region of item.region ?? []) tags.push(region);
  for (const code of item.badges) {
    if (!DDAY_BADGES.includes(code)) tags.push(BADGE_LABELS[code]);
  }
  return tags.map((tag) => tag.replace(/\s+/g, ""));
}

export function OpportunityCard({ item }: { item: Card }) {
  const organization = item.organization ?? "주관기관 미상";
  const tags = hashtags(item);
  return (
    <article className="press relative rounded-[14px] border-[0.5px] border-line bg-bg p-4 transition-transform hover:-translate-y-px hover:border-edge">
      <div className="flex items-start gap-2.5">
        <SourceBadge source={item.source} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{organization}</p>
          <p className="mt-0.5 truncate text-[12px] font-medium text-accent">
            {sourceLabel(item.source)}
          </p>
        </div>
        <BookmarkButton id={item.id} className="relative z-10 -mr-1 -mt-1" />
      </div>

      <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
        {item.title}
      </h3>

      {tags.length ? (
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className={`text-[12.5px] ${index === 0 ? "text-accent" : "text-muted"}`}
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3.5">
        <DDay item={item} />
      </div>

      <Link
        href={`/opportunities/${item.id}`}
        className="absolute inset-0 rounded-[14px]"
        aria-label={`${item.title} 상세 보기`}
      />
    </article>
  );
}

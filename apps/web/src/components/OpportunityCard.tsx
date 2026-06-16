import Link from "next/link";
import type { OpportunityCard as Card } from "@/lib/api";
import { sourceLabel } from "@/lib/labels";
import { Badge } from "./Badge";
import { BookmarkButton } from "./BookmarkButton";
import { DDay } from "./DDay";

function Tag({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "muted" }) {
  const cls =
    tone === "blue" ? "bg-surface-blue text-accent" : "bg-surface text-secondary";
  return (
    <span className={`rounded-[5px] px-1.5 py-0.5 text-[10.5px] ${cls}`}>{children}</span>
  );
}

export function OpportunityCard({ item }: { item: Card }) {
  const organization = item.organization ?? "주관기관 미상";
  return (
    <article className="press relative rounded-[14px] border-[0.5px] border-line bg-bg p-3.5 transition-transform hover:-translate-y-px hover:border-edge">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {item.badges.map((code) => (
            <Badge key={code} code={code} />
          ))}
        </div>
        <BookmarkButton id={item.id} className="relative z-10 -mr-1 -mt-1" />
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="grid h-[18px] w-[18px] place-items-center rounded bg-surface-blue text-[10px] font-medium text-accent">
          {organization.charAt(0)}
        </span>
        <span className="truncate text-[12px] text-muted">{organization}</span>
      </div>

      <h3 className="mt-1.5 line-clamp-2 text-[14px] font-medium leading-snug text-ink">
        {item.title}
      </h3>

      <div className="mt-2 flex flex-wrap gap-1">
        {item.category ? <Tag>{item.category}</Tag> : null}
        {item.region ? <Tag tone="muted">{item.region}</Tag> : null}
        <Tag tone="muted">{sourceLabel(item.source)}</Tag>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-hair pt-2.5">
        <DDay item={item} />
        <span className="text-[13px] text-dim" aria-hidden="true">
          →
        </span>
      </div>

      <Link
        href={`/opportunities/${item.id}`}
        className="absolute inset-0 rounded-[14px]"
        aria-label={`${item.title} 상세 보기`}
      />
    </article>
  );
}

import type { OpportunityList } from "@/lib/api";
import { EmptyState } from "./EmptyState";
import { OpportunityCard } from "./OpportunityCard";
import { Pagination } from "./Pagination";

interface EmptyCopy {
  title: string;
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
}

interface Props {
  list: OpportunityList;
  basePath: string;
  params: Record<string, string>;
  empty: EmptyCopy;
}

export function OpportunityGrid({ list, basePath, params, empty }: Props) {
  if (list.items.length === 0) {
    return <EmptyState {...empty} />;
  }
  return (
    <div>
      <p className="text-[13px] text-muted">
        총 <span className="tnum font-medium text-secondary">{list.totalItems}</span>건
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        {list.items.map((item) => (
          <OpportunityCard key={item.id} item={item} />
        ))}
      </div>
      <Pagination
        basePath={basePath}
        params={params}
        page={list.page}
        totalPages={list.totalPages}
      />
    </div>
  );
}

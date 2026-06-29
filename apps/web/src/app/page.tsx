import { Suspense } from "react";
import { ErrorState } from "@/components/ErrorState";
import { FilterBar } from "@/components/FilterBar";
import { Hero } from "@/components/Hero";
import { ListViewTracker } from "@/components/ListViewTracker";
import { OpportunityGrid } from "@/components/OpportunityGrid";
import { PersonaTabs } from "@/components/PersonaTabs";
import { fetchOpportunities, fetchStats, type OpportunityList, type Stats } from "@/lib/api";
import { listViewPayload, paramsRecord, toApiQuery, type RawParams } from "@/lib/query";

const EMPTY = {
  title: "조건에 맞는 공고가 없어요",
  message: "필터를 줄이거나 전체 탭에서 둘러보세요.",
  ctaHref: "/",
  ctaLabel: "전체 공고 보기",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const sp = await searchParams;
  let list: OpportunityList | null = null;
  try {
    list = await fetchOpportunities(toApiQuery(sp));
  } catch {
    list = null;
  }
  const stats: Stats | null = await fetchStats();

  return (
    <div>
      <Hero stats={stats} />
      <div className="mx-auto max-w-[1200px] px-3.5 py-7">
        <Suspense fallback={null}>
          <PersonaTabs />
          <div className="mt-4">
            <FilterBar />
          </div>
        </Suspense>
        <div className="mt-6">
          {list ? (
            <>
              <ListViewTracker payload={listViewPayload(sp, list.totalItems)} />
              <OpportunityGrid
                list={list}
                basePath="/"
                params={paramsRecord(sp)}
                empty={EMPTY}
              />
            </>
          ) : (
            <ErrorState retryHref="/" />
          )}
        </div>
      </div>
    </div>
  );
}

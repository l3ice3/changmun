import { Suspense } from "react";
import type { Metadata } from "next";
import { ErrorState } from "@/components/ErrorState";
import { FilterBar } from "@/components/FilterBar";
import { ListViewTracker } from "@/components/ListViewTracker";
import { OpportunityGrid } from "@/components/OpportunityGrid";
import { PersonaTabs } from "@/components/PersonaTabs";
import { SearchBar } from "@/components/SearchBar";
import { fetchOpportunities, type OpportunityList } from "@/lib/api";
import { listViewPayload, paramsRecord, toApiQuery, type RawParams } from "@/lib/query";

export const metadata: Metadata = { title: "검색" };

const EMPTY = {
  title: "검색 결과가 없어요",
  message: "다른 키워드로 검색하거나 필터를 바꿔보세요.",
  ctaHref: "/",
  ctaLabel: "전체 공고 보기",
};

function term(sp: RawParams): string {
  const raw = sp.q;
  return (Array.isArray(raw) ? raw[0] : (raw ?? "")).trim();
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const sp = await searchParams;
  const query = term(sp);
  const tooShort = query.length === 1;

  let list: OpportunityList | null = null;
  let failed = false;
  if (!tooShort) {
    try {
      list = await fetchOpportunities(toApiQuery(sp));
    } catch {
      failed = true;
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-3.5 py-7">
      <h1 className="text-[21px] font-semibold tracking-tight">검색</h1>
      <div className="mt-4 max-w-xl">
        <SearchBar initial={query} />
      </div>

      <div className="mt-6">
        <Suspense fallback={null}>
          <PersonaTabs />
          <div className="mt-4">
            <FilterBar />
          </div>
        </Suspense>
      </div>

      <div className="mt-6">
        {tooShort ? (
          <p className="rounded-lg bg-surface-blue px-4 py-3 text-[13px] text-accent">
            2글자 이상 입력해주세요.
          </p>
        ) : failed || !list ? (
          <ErrorState retryHref="/search" />
        ) : (
          <>
            <ListViewTracker payload={listViewPayload(sp, list.totalItems)} />
            <OpportunityGrid
              list={list}
              basePath="/search"
              params={paramsRecord(sp)}
              empty={EMPTY}
            />
          </>
        )}
      </div>
    </div>
  );
}

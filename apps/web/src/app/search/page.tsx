import type { Metadata } from "next";
import { ErrorState } from "@/components/ErrorState";
import { FilterBar } from "@/components/FilterBar";
import { ListViewTracker } from "@/components/ListViewTracker";
import { OpportunityGrid } from "@/components/OpportunityGrid";
import { SearchBar } from "@/components/SearchBar";
import { fetchOpportunities, type OpportunityList } from "@/lib/api";
import { listViewPayload, paramsRecord, toApiQuery, type RawParams } from "@/lib/query";

export const metadata: Metadata = { title: "공고 탐색" };

// S3 공고 탐색·검색 허브 — 페르소나 탭 + 필터 + 전체 리스트가 여기(직행식 IA, 팀 합의).
// 빈 상태 문구는 검색(q)과 탐색(필터)을 구분한다 — AC-012는 탐색 쪽 문구 기준.
const BROWSE_EMPTY = {
  title: "조건에 맞는 공고가 없어요",
  message: "필터를 줄여서 다시 둘러보세요.",
  ctaHref: "/search",
  ctaLabel: "전체 공고 보기",
};

const SEARCH_EMPTY = {
  title: "검색 결과가 없어요",
  message: "다른 키워드로 검색하거나 필터를 바꿔보세요.",
  ctaHref: "/search",
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
    <div className="mx-auto max-w-[1400px] px-3.5 py-7">
      <h1 className="text-[22px] font-semibold tracking-tight">공고 탐색</h1>
      <div className="mt-4 max-w-xl">
        <SearchBar initial={query} />
      </div>

      {/* 지원 대상은 탭이 아닌 필터 행의 드롭다운(QA #19). /search는 searchParams를 읽는
          동적 라우트 — useSearchParams용 Suspense 불필요(dev HMR hidden 고착 원인이기도 했다). */}
      <div className="mt-6">
        <FilterBar />
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
              empty={query ? SEARCH_EMPTY : BROWSE_EMPTY}
            />
          </>
        )}
      </div>
    </div>
  );
}

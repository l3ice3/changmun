import Link from "next/link";
import { Hero } from "@/components/Hero";
import { SourceBrowse } from "@/components/SourceBrowse";
import { fetchOpportunities, fetchStats, type OpportunityCard, type Stats } from "@/lib/api";

const SOURCE_KEYS = ["k-startup", "bizinfo", "ontong-youth"];

// 출처별 둘러보기 섹션용 — 출처별 최신 6건을 서버에서 미리 fetch(ISR 캐시). 실패한 출처는 빈 배열.
async function fetchSourceGroups(): Promise<Record<string, OpportunityCard[]>> {
  const entries = await Promise.all(
    SOURCE_KEYS.map(async (source) => {
      try {
        const query = new URLSearchParams({ source, size: "6", sort: "latest" });
        const result = await fetchOpportunities(query);
        return [source, result.items] as const;
      } catch {
        return [source, [] as OpportunityCard[]] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

// S1 탐색 홈 — 히어로 + 출처별 둘러보기. 페르소나 탭·필터·전체 리스트는 S3(/search)로 분리
// (직행식 IA, 팀 합의 — screens.md S1·S3, PRD FR-003).
export default async function Home() {
  const stats: Stats | null = await fetchStats();
  const sourceGroups = await fetchSourceGroups();

  return (
    <div>
      <Hero stats={stats} />
      <div className="mx-auto max-w-[1400px] px-3.5 py-7">
        <SourceBrowse groups={sourceGroups} />

        <div className="mt-10 text-center">
          <Link
            href="/search"
            className="press inline-flex h-12 items-center rounded-full bg-surface-blue px-7 text-[15px] font-medium text-accent hover:bg-accent hover:text-white"
          >
            전체 공고 모두 보기
          </Link>
        </div>
      </div>
    </div>
  );
}

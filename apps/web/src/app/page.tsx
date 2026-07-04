import Link from "next/link";
import { BrowseSection, type BrowseOption } from "@/components/BrowseSection";
import { Hero } from "@/components/Hero";
import { fetchOpportunities, fetchStats, type OpportunityCard } from "@/lib/api";
import {
  CATEGORIES,
  DEFAULT_BROWSE_PERSONA,
  PERSONA_OPTIONS,
  REGIONS,
  SOURCE_OPTIONS,
} from "@/lib/labels";

// 분류별 섹션 옵션 — 각 섹션은 칩 1개(직행식). 모든 조합 필터는 S3(공고 탐색)에서.
const CATEGORY_OPTIONS: BrowseOption[] = CATEGORIES.map((name) => ({ value: name, label: name }));
const REGION_OPTIONS: BrowseOption[] = REGIONS.map((name) => ({ value: name, label: name }));

const DEFAULT_SOURCE = "k-startup";
const DEFAULT_CATEGORY = CATEGORIES[0]; // 사업화
const DEFAULT_REGION = REGIONS[0]; // 전국

// 섹션 기본 조합을 서버에서 미리 fetch(ISR 캐시). 실패는 빈 배열 — 섹션이 홈을 깨지 않는다.
async function fetchSection(params: Record<string, string>): Promise<OpportunityCard[]> {
  try {
    const query = new URLSearchParams({ size: "6", ...params });
    const result = await fetchOpportunities(query);
    return result.items;
  } catch {
    return [];
  }
}

// S1 탐색 홈 — 히어로 + 분류별 문장형 섹션 4개(지원 대상 → 출처 → 분야 → 지역, 우선순위 순).
export default async function Home() {
  const [stats, personaItems, sourceItems, categoryItems, regionItems] = await Promise.all([
    fetchStats(),
    fetchSection({ persona: DEFAULT_BROWSE_PERSONA }),
    fetchSection({ source: DEFAULT_SOURCE }),
    fetchSection({ category: DEFAULT_CATEGORY }),
    fetchSection({ region: DEFAULT_REGION }),
  ]);

  return (
    <div>
      <Hero stats={stats} />
      <div className="mx-auto max-w-[1400px] px-3.5 py-7">
        {/* 수식어는 분류 성격에 맞게 통일(시간 수식어 X) — 대상·출처·분야·지역 (QA #19). */}
        <BrowseSection
          prefix="내 단계에 맞는"
          ariaLabel="지원 대상"
          options={PERSONA_OPTIONS}
          defaultValue={DEFAULT_BROWSE_PERSONA}
          queryKey="persona"
          initialItems={personaItems}
        />
        <BrowseSection
          prefix="한곳에 모아 본"
          ariaLabel="출처"
          options={SOURCE_OPTIONS}
          defaultValue={DEFAULT_SOURCE}
          queryKey="source"
          initialItems={sourceItems}
        />
        <BrowseSection
          prefix="분야별로 골라 보는"
          ariaLabel="분야"
          options={CATEGORY_OPTIONS}
          defaultValue={DEFAULT_CATEGORY}
          queryKey="category"
          initialItems={categoryItems}
        />
        <BrowseSection
          prefix="우리 지역"
          ariaLabel="지역"
          options={REGION_OPTIONS}
          defaultValue={DEFAULT_REGION}
          queryKey="region"
          initialItems={regionItems}
        />

        <div className="mt-12 text-center">
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

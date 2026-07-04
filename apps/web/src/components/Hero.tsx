import Link from "next/link";
import type { Stats } from "@/lib/api";
import { HeroSearch } from "./HeroSearch";

const POPULAR = ["예비창업패키지", "청년창업사관학교", "R&D", "바우처", "글로벌"];

// 단 하나의 딥 네이비 히어로 블록 — frosted grain, 중앙 정렬. 콘텐츠와 동일 폭(max-w-[1400px]) 셸.
export function Hero({ stats }: { stats: Stats | null }) {
  return (
    <section className="mx-auto max-w-[1400px] px-3.5 pt-4">
      <div className="hero-sea rounded-[18px] px-6 py-12 text-center sm:px-10 sm:py-16">
        <p className="text-[12px] font-medium tracking-wide text-hero-label">창업의 문을 여는 창</p>
        <h1 className="mt-2 text-[22px] font-semibold leading-tight tracking-tight text-hero-text sm:text-[32px]">
          내 단계에 맞는 정부 지원금만,
          <br />
          한눈에.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[13px] leading-relaxed text-hero-sub sm:text-[14px]">
          K-Startup·기업마당·온통청년에 흩어진 창업 지원사업을 한곳에 모아,
          <br />
          예비·초기 창업자·대학생 단계에 맞는 것만 골라드려요.
        </p>

        <div className="mx-auto mt-6 max-w-xl">
          <HeroSearch />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[12px] text-hero-label">인기</span>
          {POPULAR.map((keyword) => (
            <Link
              key={keyword}
              href={`/search?q=${encodeURIComponent(keyword)}`}
              className="press rounded-full bg-white/10 px-2.5 py-1 text-[12px] text-hero-sub hover:bg-white/20"
            >
              {keyword}
            </Link>
          ))}
        </div>

        {stats ? (
          <div className="mx-auto mt-8 flex max-w-md items-center divide-x divide-white/15">
            <Stat label="진행 중 공고" value={stats.open} />
            <Stat label="오늘 뜬 공고" value={stats.newToday} />
            <Stat label="마감임박" value={stats.closingSoon} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 px-4">
      <div className="tnum text-[20px] font-semibold text-hero-text">{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[12px] text-hero-sub">{label}</div>
    </div>
  );
}

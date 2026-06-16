import Link from "next/link";
import { SearchBar } from "./SearchBar";

const POPULAR = ["예비창업패키지", "청년창업사관학교", "R&D", "바우처", "글로벌"];

// 단 하나의 딥 네이비 히어로 블록 — frosted grain. 페이지/섹션 배경으로 쓰지 않는다 (DESIGN.md §2·7).
export function Hero() {
  return (
    <section className="px-3.5 pt-3.5">
      <div className="grain-hero overflow-hidden rounded-[18px] bg-hero px-6 py-10 sm:px-10 sm:py-14">
        <p className="text-[12px] font-medium tracking-wide text-hero-label">
          창업의 문을 여는 창
        </p>
        <h1 className="mt-2 text-[21px] font-semibold leading-tight tracking-tight text-hero-text sm:text-[32px]">
          내 단계에 맞는 정부 지원금만,
          <br />
          가입 없이 한 번에.
        </h1>
        <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-hero-sub sm:text-[14px]">
          예비·초기 창업자와 대학생을 위해 K-Startup·기업마당·온통청년의 창업 공고를 모아 골라드려요.
        </p>

        <div className="mt-6 max-w-xl">
          <SearchBar variant="hero" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
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
      </div>
    </section>
  );
}

import Link from "next/link";
import { TopSearch } from "./TopSearch";

// 상단 헤더 — 데스크톱 전용(모바일은 Nav가 대신). 좌측 워드마크(히어로 좌측 끝선 정렬) + 우측 검색.
export function TopBar() {
  return (
    <header className="hidden h-16 items-center border-b border-hair bg-bg lg:flex">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-3.5">
        <Link href="/" aria-label="창문 홈" className="press inline-flex items-center">
          <span className="brand-logo text-[24px] leading-none text-hero">창문</span>
        </Link>
        <TopSearch />
      </div>
    </header>
  );
}

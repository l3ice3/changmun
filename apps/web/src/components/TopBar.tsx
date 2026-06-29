import Link from "next/link";
import { WindowMark } from "./WindowMark";

// 상단 워드마크 헤더 — 데스크톱 전용(모바일은 Nav가 대신). 디스플레이 폰트 + 중앙 정렬.
export function TopBar() {
  return (
    <header className="hidden h-16 items-center justify-center border-b border-hair bg-bg lg:flex">
      <Link href="/" aria-label="창문 홈" className="press flex items-center gap-2">
        <WindowMark className="h-7 w-7" />
        <span className="brand-logo text-[24px] leading-none text-hero">창문</span>
      </Link>
    </header>
  );
}

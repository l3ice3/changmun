import Link from "next/link";
import { AuthMenu } from "./AuthMenu";
import { BrandWordmark } from "./BrandWordmark";
import { TopSearch } from "./TopSearch";

// 상단 헤더 — 데스크톱 전용(모바일은 Nav가 대신). 좌측 워드마크(글자, 원래 자리 — QA #30)
// + 우측 검색·로그인. 마크(로고)는 사이드바 레일이 담당.
export function TopBar() {
  return (
    <header className="hidden h-[72px] items-center bg-bg lg:flex">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-3.5">
        <Link href="/" aria-label="창문 홈" className="press inline-flex items-center">
          <BrandWordmark className="h-[24px] w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <TopSearch />
          <AuthMenu />
        </div>
      </div>
    </header>
  );
}

import { AuthMenu } from "./AuthMenu";
import { TopSearch } from "./TopSearch";

// 상단 헤더 — 데스크톱 전용(모바일은 Nav가 대신). 워드마크는 사이드바로 이동(QA #28),
// 좌측은 비워두고 우측 검색·로그인만.
export function TopBar() {
  return (
    <header className="hidden h-[72px] items-center bg-bg lg:flex">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-end px-3.5">
        <div className="flex items-center gap-3">
          <TopSearch />
          <AuthMenu />
        </div>
      </div>
    </header>
  );
}

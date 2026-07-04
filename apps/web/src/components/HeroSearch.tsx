"use client";

import { useState } from "react";
import { SearchIcon, SearchOverlay } from "./SearchOverlay";

// 히어로 검색 — 흰 알약 트리거를 누르면 최근/인기 검색 팝업(SearchOverlay)이 열린다.
export function HeroSearch() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press flex h-[46px] w-full items-center gap-2 rounded-[12px] bg-white px-4 text-left text-[14px] text-muted"
      >
        <SearchIcon className="h-[18px] w-[18px] text-accent" />
        공고명으로 검색 (예: 청년창업사관학교)
      </button>

      <SearchOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}

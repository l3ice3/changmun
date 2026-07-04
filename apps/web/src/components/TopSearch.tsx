"use client";

import { useState } from "react";
import { SearchIcon, SearchOverlay } from "./SearchOverlay";

// 상단바 검색 — 입력창처럼 보이는 트리거. 누르면 히어로와 같은 최근/인기 검색 팝업이 열린다.
export function TopSearch() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="공고 검색"
        className="press flex h-11 w-[320px] items-center gap-2.5 rounded-full bg-surface pl-4 pr-4 text-left text-[14px] text-muted hover:bg-surface-blue/60"
      >
        <SearchIcon className="h-5 w-5" />
        공고 검색
      </button>

      <SearchOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}

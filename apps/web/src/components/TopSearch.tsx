"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/events";

// 상단바 검색 — 직행식 상시 노출 검색 입력. 2글자 이상이면 /search?q=로 이동(서버가 최소 2글자 검증).
export function TopSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (query.length < 2) {
      router.push("/search");
      return;
    }
    track("search", { q: query });
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={submit} className="relative w-[260px]">
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <circle cx="9" cy="9" r="6" />
        <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="공고 검색"
        aria-label="공고 검색"
        className="h-9 w-full rounded-full bg-surface pl-9 pr-3.5 text-[13px] text-ink outline-none placeholder:text-muted focus:bg-surface-blue/60 focus:ring-1 focus:ring-edge"
      />
    </form>
  );
}

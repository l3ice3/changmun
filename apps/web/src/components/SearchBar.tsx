"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/events";

interface Props {
  variant?: "hero" | "plain";
  initial?: string;
}

// 검색바. 1글자는 요청하지 않고 안내 (AC-020). 빈 검색어는 전체 유지.
export function SearchBar({ variant = "plain", initial = "" }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const term = value.trim();
    if (term.length === 0) {
      setError("");
      router.push("/search");
      return;
    }
    if (term.length < 2) {
      setError("2글자 이상 입력해주세요");
      return;
    }
    setError("");
    track("search", { q: term });
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  const hero = variant === "hero";
  const inputClass = hero
    ? "h-[42px] flex-1 rounded-[10px] bg-white px-3.5 text-[14px] text-ink placeholder:text-muted outline-none"
    : "h-[42px] flex-1 rounded-[10px] border border-line bg-surface px-3.5 text-[14px] text-ink placeholder:text-muted outline-none focus:border-edge";
  const buttonClass = hero
    ? "h-[42px] rounded-[10px] bg-accent-bright px-5 text-[14px] font-medium text-white"
    : "h-[42px] rounded-[10px] bg-accent px-5 text-[14px] font-medium text-white hover:bg-accent-hover";

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex gap-2">
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="공고명으로 검색 (예: 청년창업사관학교)"
          className={inputClass}
        />
        <button type="submit" className={`press ${buttonClass}`}>
          검색
        </button>
      </div>
      {error ? (
        <p className={`mt-1.5 text-[12px] ${hero ? "text-hero-sub" : "text-danger"}`}>
          {error}
        </p>
      ) : null}
    </form>
  );
}

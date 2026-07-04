"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { track } from "@/lib/events";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "@/lib/recentSearches";

const POPULAR = [
  "예비창업패키지",
  "청년창업사관학교",
  "R&D 바우처",
  "초기창업패키지",
  "글로벌",
  "로컬 크리에이터",
  "대학생 창업",
  "멘토링",
];

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="9" r="6" />
      <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// 최근/인기 검색 팝업 — 히어로·상단바 검색 트리거가 공유한다(HeroSearch에서 추출).
export function SearchOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setValue("");
    setError("");
    setRecents(getRecentSearches());
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function go(term: string) {
    const trimmed = term.trim();
    if (trimmed.length === 0) {
      onClose();
      router.push("/search");
      return;
    }
    if (trimmed.length < 2) {
      setError("2글자 이상 입력해주세요");
      return;
    }
    addRecentSearch(trimmed);
    track("search", { q: trimmed });
    onClose();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function dropRecent(term: string) {
    removeRecentSearch(term);
    setRecents(getRecentSearches());
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-[18vh]">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />
      <div className="animate-slide-up relative max-h-[72vh] w-full max-w-3xl overflow-y-auto rounded-[20px] bg-bg p-5 text-left shadow-[0_24px_64px_rgba(25,31,40,0.3)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            go(value);
          }}
        >
          <div className="flex items-center gap-2.5 rounded-[14px] border border-edge bg-surface px-4 focus-within:border-accent">
            <SearchIcon className="h-[22px] w-[22px] text-muted" />
            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="어떤 공고를 찾으시나요?"
              className="h-14 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
            />
          </div>
        </form>
        {error ? <p className="mt-1.5 px-1 text-[12px] text-danger">{error}</p> : null}

        {recents.length > 0 ? (
          <div className="mt-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-medium text-secondary">최근 검색</span>
              <button
                type="button"
                onClick={() => {
                  clearRecentSearches();
                  setRecents([]);
                }}
                className="text-[12px] text-muted hover:text-secondary"
              >
                전체삭제
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recents.map((term) => (
                <span
                  key={term}
                  className="flex items-center gap-1 rounded-full bg-surface py-1 pl-3 pr-1.5 text-[13px] text-secondary"
                >
                  <button type="button" onClick={() => go(term)} className="press">
                    {term}
                  </button>
                  <button
                    type="button"
                    onClick={() => dropRecent(term)}
                    aria-label={`${term} 삭제`}
                    className="grid h-4 w-4 place-items-center rounded-full text-muted hover:bg-line"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <span className="px-1 text-[12px] font-medium text-secondary">인기 검색</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {POPULAR.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => go(term)}
                className="press rounded-full bg-surface-blue px-3 py-1 text-[13px] text-accent"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="press rounded-lg px-3 py-1.5 text-[13px] text-muted hover:bg-surface hover:text-secondary"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

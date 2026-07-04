"use client";

import { useEffect, useState } from "react";
import { loadBookmarkIds, toggleBookmark } from "@/lib/bookmarks";
import { track } from "@/lib/events";

interface Props {
  id: number;
  className?: string;
}

export function BookmarkButton({ id, className = "" }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    loadBookmarkIds().then((ids) => {
      if (active) setSaved(ids.includes(id));
    });
    return () => {
      active = false;
    };
  }, [id]);

  // 낙관적 업데이트 — 실패 시 롤백. 로그인 시 서버, 아니면 localStorage (lib/bookmarks).
  async function onClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = !saved;
    setSaved(next);
    try {
      await toggleBookmark(id, saved);
      track(next ? "bookmark_add" : "bookmark_remove", { opportunityId: id });
    } catch {
      setSaved(!next);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "찜 해제" : "찜하기"}
      className={`press grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface ${className}`}
    >
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden="true">
        <path
          d="M6 3.5h8c.55 0 1 .45 1 1V16.5l-5-3-5 3V4.5c0-.55.45-1 1-1z"
          fill={saved ? "var(--color-accent)" : "none"}
          stroke={saved ? "var(--color-accent)" : "currentColor"}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

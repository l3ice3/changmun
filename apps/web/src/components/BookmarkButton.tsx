"use client";

import { useEffect, useState } from "react";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { track } from "@/lib/events";

interface Props {
  id: number;
  className?: string;
}

export function BookmarkButton({ id, className = "" }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isBookmarked(id));
  }, [id]);

  function onClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = toggleBookmark(id);
    setSaved(next);
    track(next ? "bookmark_add" : "bookmark_remove", { opportunityId: id });
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
          d="M10 16.5l-1.1-1C5 11.9 2.7 9.8 2.7 7.2 2.7 5.2 4.3 3.7 6.3 3.7c1.1 0 2.2.5 2.9 1.4l.8.9.8-.9c.7-.9 1.8-1.4 2.9-1.4 2 0 3.6 1.5 3.6 3.5 0 2.6-2.3 4.7-6.2 8.3l-1.1 1z"
          fill={saved ? "var(--color-accent)" : "none"}
          stroke={saved ? "var(--color-accent)" : "currentColor"}
          strokeWidth="1.4"
        />
      </svg>
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { OpportunityCard } from "@/components/OpportunityCard";
import { fetchByIds, type OpportunityCard as Card } from "@/lib/api";
import { getBookmarks, usesSessionFallback } from "@/lib/bookmarks";

export default function BookmarksPage() {
  const [items, setItems] = useState<Card[] | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    setFallback(usesSessionFallback());
    const ids = getBookmarks();
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    fetchByIds(ids)
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] px-3.5 py-7">
      <h1 className="text-[21px] font-semibold tracking-tight">찜한 공고</h1>
      {fallback ? (
        <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-[12px] text-muted">
          이 기기에 저장돼요. 시크릿 모드에서는 창을 닫으면 사라질 수 있어요.
        </p>
      ) : null}

      <div className="mt-6">
        {items === null ? (
          <LoadingGrid />
        ) : items.length === 0 ? (
          <EmptyState
            title="찜한 공고가 없어요"
            message="관심 있는 공고의 하트를 눌러 모아보세요."
            ctaHref="/"
            ctaLabel="공고 둘러보기"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
            {items.map((item) => (
              <OpportunityCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[14px] border-[0.5px] border-line bg-surface"
        />
      ))}
    </div>
  );
}

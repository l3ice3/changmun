"use client";

import { useState } from "react";
import type { OpportunityCard as Card } from "@/lib/api";
import { sourceLabel } from "@/lib/labels";
import { OpportunityCard } from "./OpportunityCard";
import { SourceBadge } from "./SourceBadge";

const SOURCES = ["k-startup", "bizinfo", "ontong-youth"] as const;

// 출처별(KS·기업마당·온통청년) 둘러보기 — 서버가 3개 출처를 미리 fetch해 넘기고, 탭으로 토글만 한다(클라 fetch 없음).
export function SourceBrowse({ groups }: { groups: Record<string, Card[]> }) {
  const [active, setActive] = useState<string>(SOURCES[0]);
  const items = groups[active] ?? [];

  return (
    <section className="mt-10">
      <h2 className="text-[18px] font-semibold tracking-tight text-ink">출처별 둘러보기</h2>
      <p className="mt-1 text-[13px] text-muted">공식 3곳에서 모은 최신 공고를 출처별로 확인하세요.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {SOURCES.map((source) => {
          const on = active === source;
          return (
            <button
              key={source}
              type="button"
              onClick={() => setActive(source)}
              aria-pressed={on}
              className={`press flex items-center gap-1.5 rounded-full border py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium ${
                on
                  ? "border-edge bg-surface-blue text-accent"
                  : "border-line bg-surface text-secondary hover:border-strong"
              }`}
            >
              <SourceBadge source={source} size="sm" />
              {sourceLabel(source)}
            </button>
          );
        })}
      </div>

      {items.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <OpportunityCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[14px] border border-line bg-surface px-4 py-8 text-center text-[13px] text-muted">
          {sourceLabel(active)} 공고가 아직 없어요.
        </p>
      )}
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { OpportunityCard as Card } from "@/lib/api";
import { sourceLabel } from "@/lib/labels";
import { OpportunityCard } from "./OpportunityCard";
import { SourceBadge } from "./SourceBadge";

const SOURCES = ["k-startup", "bizinfo", "ontong-youth"] as const;

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 출처별(KS·기업마당·온통청년) 둘러보기 — 서버가 3개 출처를 미리 fetch해 넘기고, 토글만 한다(클라 fetch 없음).
// 헤딩은 문장형: "새로 올라온 [출처▾] 공고" — 문장 안에 선택 칩이 들어가 자연스럽게 (QA #18).
export function SourceBrowse({ groups }: { groups: Record<string, Card[]> }) {
  const [active, setActive] = useState<string>(SOURCES[0]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const items = groups[active] ?? [];

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(source: string) {
    setActive(source);
    setOpen(false);
  }

  return (
    <section className="mt-12">
      <h2 className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[21px] font-semibold tracking-tight text-ink">
        새로 올라온
        <span ref={ref} className="relative inline-flex">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="press flex items-center gap-1.5 rounded-[10px] bg-surface px-3 py-1.5 text-[18px] font-semibold text-accent hover:bg-surface-blue"
          >
            {sourceLabel(active)}
            <ChevronIcon open={open} />
          </button>
          {open ? (
            <div
              role="listbox"
              aria-label="출처 선택"
              className="animate-pop-in absolute left-0 top-full z-30 mt-1.5 min-w-[190px] rounded-xl border border-line bg-bg p-1.5 shadow-[0_10px_34px_rgba(25,31,40,0.14)]"
            >
              {SOURCES.map((source) => (
                <button
                  key={source}
                  type="button"
                  role="option"
                  aria-selected={active === source}
                  onClick={() => pick(source)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[14px] ${
                    active === source
                      ? "bg-surface-blue font-medium text-accent"
                      : "text-secondary hover:bg-surface"
                  }`}
                >
                  <SourceBadge source={source} size="sm" />
                  {sourceLabel(source)}
                </button>
              ))}
            </div>
          ) : null}
        </span>
        공고
      </h2>

      {items.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <OpportunityCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-[14px] border border-line bg-surface px-4 py-8 text-center text-[13px] text-muted">
          {sourceLabel(active)} 공고가 아직 없어요.
        </p>
      )}
    </section>
  );
}

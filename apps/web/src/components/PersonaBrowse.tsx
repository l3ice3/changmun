"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { OpportunityCard as Card } from "@/lib/api";
import { PERSONA_TABS } from "@/lib/labels";
import { OpportunityCard } from "./OpportunityCard";

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

// 홈 페르소나 진입 섹션 — "마감이 가까운 [페르소나▾] 공고" 문장형 헤딩(출처별 섹션과 대칭).
// 서버가 4개 그룹(전체·예비·대학생·초기)을 미리 fetch해 넘기고 토글만 한다(클라 fetch 없음).
// 기본 "전체" — target_* NULL(조건 미상) 공고는 전체에서만 노출(페르소나 억지 채움 금지, PRD FR-003 엣지).
export function PersonaBrowse({ groups }: { groups: Record<string, Card[]> }) {
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const items = groups[active] ?? [];
  const activeLabel = PERSONA_TABS.find((tab) => tab.key === active)?.label ?? "전체";
  const moreHref = active ? `/search?persona=${active}` : "/search";

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

  function pick(key: string) {
    setActive(key);
    setOpen(false);
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[21px] font-semibold tracking-tight text-ink">
          마감이 가까운
          <span ref={ref} className="relative inline-flex">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((prev) => !prev)}
              className="press flex items-center gap-1.5 rounded-[10px] bg-surface px-3 py-1.5 text-[18px] font-semibold text-accent hover:bg-surface-blue"
            >
              {activeLabel}
              <ChevronIcon open={open} />
            </button>
            {open ? (
              <div
                role="listbox"
                aria-label="페르소나 선택"
                className="animate-pop-in absolute left-0 top-full z-30 mt-1.5 min-w-[170px] rounded-xl border border-line bg-bg p-1.5 shadow-[0_10px_34px_rgba(25,31,40,0.14)]"
              >
                {PERSONA_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="option"
                    aria-selected={active === tab.key}
                    onClick={() => pick(tab.key)}
                    className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[14px] ${
                      active === tab.key
                        ? "bg-surface-blue font-medium text-accent"
                        : "text-secondary hover:bg-surface"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}
          </span>
          공고
        </h2>
        <Link
          href={moreHref}
          className="press text-[13.5px] font-medium text-muted hover:text-accent"
        >
          더 보기 →
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <OpportunityCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-[14px] border border-line bg-surface px-4 py-8 text-center text-[13px] text-muted">
          {activeLabel} 공고가 아직 없어요. 전체에서 둘러보세요.
        </p>
      )}
    </section>
  );
}

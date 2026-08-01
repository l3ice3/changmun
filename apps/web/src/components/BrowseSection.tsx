"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchOpportunities, type OpportunityCard as Card } from "@/lib/api";
import { OpportunityCard } from "./OpportunityCard";

export interface BrowseOption {
  value: string;
  label: string;
}

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

interface Props {
  /** 문장 앞부분 — 예: "마감이 가까운" */
  prefix: string;
  /** 문장 뒷부분 (기본 "공고") */
  suffix?: string;
  ariaLabel: string;
  options: BrowseOption[];
  defaultValue: string;
  /** API·/search 쿼리 키 — persona | source | category | region */
  queryKey: string;
  /** 섹션 고유 추가 쿼리 — 예: 출처 섹션 {sort:"latest"} */
  extraQuery?: Record<string, string>;
  initialItems: Card[];
}

// 직행식 분류별 문장형 섹션 — 홈에서 분류(대상·출처·분야·지역)마다 하나씩, 칩은 섹션당 1개 (QA #19).
// 기본값은 서버 프리페치, 칩 변경 시에만 클라 fetch. 모든 조합 필터는 S3(공고 탐색)에서.
export function BrowseSection({
  prefix,
  suffix = "공고",
  ariaLabel,
  options,
  defaultValue,
  queryKey,
  extraQuery,
  initialItems,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Card[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const firstRender = useRef(true);

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

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let active = true;
    setLoading(true);
    const query = new URLSearchParams({ size: "6", ...extraQuery, [queryKey]: value });
    fetchOpportunities(query)
      .then((result) => {
        if (active) setItems(result.items);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // extraQuery는 섹션 고정값 — value 변경만 재조회 트리거.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, queryKey]);

  const label = options.find((option) => option.value === value)?.label ?? value;
  const moreHref = `/search?${new URLSearchParams({ [queryKey]: value }).toString()}`;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[21px] font-semibold tracking-tight text-ink">
          {prefix}
          <span ref={ref} className="relative inline-flex">
            <button
              type="button"
              aria-label={ariaLabel}
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((prev) => !prev)}
              className="press flex items-center gap-1.5 rounded-[10px] bg-surface px-3 py-1.5 text-[18px] font-semibold text-accent hover:bg-surface-blue"
            >
              {label}
              <ChevronIcon open={open} />
            </button>
            {open ? (
              <div
                role="listbox"
                aria-label={ariaLabel}
                className="animate-pop-in absolute left-0 top-full z-30 mt-1.5 max-h-[300px] min-w-[170px] overflow-y-auto rounded-xl border border-line bg-bg p-1.5 shadow-[0_10px_34px_rgba(25,31,40,0.14)]"
              >
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    onClick={() => {
                      setValue(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[14px] ${
                      value === option.value
                        ? "btn-sheen font-medium text-white"
                        : "text-secondary hover:bg-surface"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </span>
          {suffix}
        </h2>
        <Link
          href={moreHref}
          className="press text-[13.5px] font-medium text-muted hover:text-accent"
        >
          더 보기 →
        </Link>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-[14px] border-[0.5px] border-line bg-surface"
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <OpportunityCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-[14px] border border-line bg-surface px-4 py-8 text-center text-[13px] text-muted">
          {label} 공고가 아직 없어요.
        </p>
      )}
    </section>
  );
}

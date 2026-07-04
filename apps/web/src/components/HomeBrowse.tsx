"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchOpportunities, type OpportunityCard as Card } from "@/lib/api";
import {
  CATEGORIES,
  DEFAULT_BROWSE_PERSONA,
  PERSONA_TABS,
  REGIONS,
  SOURCE_OPTIONS,
} from "@/lib/labels";
import { OpportunityCard } from "./OpportunityCard";

interface Option {
  value: string;
  label: string;
}

// 지원 대상은 "전체" 없이 페르소나만 — 전체 보기는 CTA·공고 탐색에서 (QA #19).
const PERSONAS: Option[] = PERSONA_TABS.filter((tab) => tab.key).map((tab) => ({
  value: tab.key,
  label: tab.label,
}));
const SOURCES: Option[] = [{ value: "", label: "전체 출처" }, ...SOURCE_OPTIONS];
const CATEGORY_OPTIONS: Option[] = [
  { value: "", label: "전체 분야" },
  ...CATEGORIES.map((name) => ({ value: name, label: name })),
];
const REGION_OPTIONS: Option[] = [
  { value: "", label: "전체 지역" },
  ...REGIONS.map((name) => ({ value: name, label: name })),
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 문장 속 선택 칩 — 각자 열림 상태 + 외부클릭/ESC 닫힘.
function Chip({
  ariaLabel,
  value,
  options,
  onPick,
}: {
  ariaLabel: string;
  value: string;
  options: Option[];
  onPick: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

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

  const label = options.find((option) => option.value === value)?.label ?? options[0].label;
  const active = value !== "";

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`press flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[16px] font-semibold hover:bg-surface-blue ${
          active ? "bg-surface text-accent" : "bg-surface text-secondary"
        }`}
      >
        {label}
        <ChevronIcon open={open} />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="animate-pop-in absolute left-0 top-full z-30 mt-1.5 max-h-[300px] min-w-[160px] overflow-y-auto rounded-xl border border-line bg-bg p-1.5 shadow-[0_10px_34px_rgba(25,31,40,0.14)]"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onPick(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[14px] ${
                value === option.value
                  ? "bg-surface-blue font-medium text-accent"
                  : "text-secondary hover:bg-surface"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}

// 홈 맞춤 둘러보기 — "마감이 가까운 [대상▾][출처▾][분야▾][지역▾] 공고" 문장형 헤딩.
// 우선순위 순서: 지원 대상 → 출처(지원 단체) → 분야 → 지역 (QA #19).
// 기본 조합(예비창업자)은 서버 프리페치, 칩 변경 시에만 클라 fetch. 더 보기 → /search(조건 유지).
export function HomeBrowse({ initialItems }: { initialItems: Card[] }) {
  const [persona, setPersona] = useState(DEFAULT_BROWSE_PERSONA);
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [items, setItems] = useState<Card[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let active = true;
    setLoading(true);
    const query = new URLSearchParams({ size: "6", persona });
    if (source) query.set("source", source);
    if (category) query.set("category", category);
    if (region) query.set("region", region);
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
  }, [persona, source, category, region]);

  const moreParams = new URLSearchParams({ persona });
  if (source) moreParams.set("source", source);
  if (category) moreParams.set("category", category);
  if (region) moreParams.set("region", region);
  const moreHref = `/search?${moreParams.toString()}`;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[21px] font-semibold tracking-tight text-ink">
          마감이 가까운
          <Chip ariaLabel="지원 대상" value={persona} options={PERSONAS} onPick={setPersona} />
          <Chip ariaLabel="출처" value={source} options={SOURCES} onPick={setSource} />
          <Chip ariaLabel="분야" value={category} options={CATEGORY_OPTIONS} onPick={setCategory} />
          <Chip ariaLabel="지역" value={region} options={REGION_OPTIONS} onPick={setRegion} />
          공고
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
          조건에 맞는 공고가 아직 없어요. 조건을 줄여 보세요.
        </p>
      )}
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface DropdownProps {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
}

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

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 직행 스타일 필터 드롭다운 — 선택 체크 + 호버 하이라이트 + 외부클릭/ESC 닫힘. 네이티브 select 대체.
export function Dropdown({ label, allLabel, value, options, onSelect }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value || "";
  const active = selected !== "";

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

  function pick(next: string) {
    onSelect(next);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`press flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] ${
          active
            ? "border-edge bg-surface-blue font-medium text-accent"
            : "border-line bg-surface text-secondary hover:border-strong"
        }`}
      >
        {selected || allLabel}
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className="animate-pop-in absolute left-0 z-30 mt-1.5 max-h-[300px] min-w-[200px] overflow-y-auto rounded-xl border border-line bg-bg p-1.5 shadow-[0_10px_34px_rgba(25,31,40,0.14)]"
        >
          <Option label={allLabel} selected={selected === ""} onPick={() => pick("")} />
          {options.map((name) => (
            <Option key={name} label={name} selected={selected === name} onPick={() => pick(name)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Option({
  label,
  selected,
  onPick,
}: {
  label: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onPick}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] ${
        selected ? "bg-surface-blue font-medium text-accent" : "text-secondary hover:bg-surface"
      }`}
    >
      {label}
      {selected ? <CheckIcon /> : null}
    </button>
  );
}

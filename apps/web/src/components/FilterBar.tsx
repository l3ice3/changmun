"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, REGIONS } from "@/lib/labels";

const SELECT_CLASS =
  "h-8 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-secondary";

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  const region = params.get("region") ?? "";
  const category = params.get("category") ?? "";
  const showClosed = params.get("status") === "all";
  const sort = params.get("sort") ?? "deadline";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="지역"
        value={region}
        onChange={(event) => update("region", event.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">전체 지역</option>
        {REGIONS.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <select
        aria-label="카테고리"
        value={category}
        onChange={(event) => update("category", event.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">전체 분야</option>
        {CATEGORIES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => update("status", showClosed ? "" : "all")}
        aria-pressed={showClosed}
        className={`press h-8 rounded-full px-3 text-[13px] ${
          showClosed
            ? "bg-surface-blue font-medium text-accent"
            : "bg-surface text-secondary"
        }`}
      >
        마감 포함
      </button>

      <div className="ml-auto flex items-center gap-1 text-[13px]">
        <SortChip current={sort} value="deadline" label="마감임박순" onPick={update} />
        <SortChip current={sort} value="latest" label="최신순" onPick={update} />
      </div>
    </div>
  );
}

function SortChip({
  current,
  value,
  label,
  onPick,
}: {
  current: string;
  value: string;
  label: string;
  onPick: (key: string, value: string) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onPick("sort", value)}
      className={`press rounded-full px-2.5 py-1 ${
        active ? "bg-surface-blue font-medium text-accent" : "text-muted hover:text-secondary"
      }`}
    >
      {label}
    </button>
  );
}

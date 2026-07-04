"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, REGIONS } from "@/lib/labels";
import { Dropdown } from "./Dropdown";

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
      <Dropdown
        label="지역"
        allLabel="전체 지역"
        value={region}
        options={REGIONS}
        onSelect={(value) => update("region", value)}
      />

      <Dropdown
        label="카테고리"
        allLabel="전체 분야"
        value={category}
        options={CATEGORIES}
        onSelect={(value) => update("category", value)}
      />

      <button
        type="button"
        onClick={() => update("status", showClosed ? "" : "all")}
        aria-pressed={showClosed}
        className={`press h-9 rounded-full px-3.5 text-[14px] ${
          showClosed
            ? "bg-surface-blue font-medium text-accent"
            : "bg-surface text-secondary"
        }`}
      >
        마감 포함
      </button>

      <div className="ml-auto flex items-center gap-1 text-[14px]">
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
      className={`press rounded-full px-3 py-1.5 ${
        active ? "bg-surface-blue font-medium text-accent" : "text-muted hover:text-secondary"
      }`}
    >
      {label}
    </button>
  );
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, PERSONA_TABS, REGIONS, SOURCE_OPTIONS } from "@/lib/labels";
import { Dropdown } from "./Dropdown";

// 지원 대상 옵션 — "전체"는 allLabel이 담당하므로 키 있는 항목만.
const PERSONA_OPTIONS = PERSONA_TABS.filter((tab) => tab.key).map((tab) => ({
  value: tab.key,
  label: tab.label,
}));

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

  const persona = params.get("persona") ?? "";
  const source = params.get("source") ?? "";
  const region = params.get("region") ?? "";
  const category = params.get("category") ?? "";
  const showClosed = params.get("status") === "all";
  const sort = params.get("sort") ?? "deadline";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 필터 순서: 지역 → 분야 → 지원 대상 → 출처 (QA #19 — 페르소나 탭을 필터 행으로 편입). */}
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

      <Dropdown
        label="지원 대상"
        allLabel="전체 대상"
        value={persona}
        options={PERSONA_OPTIONS}
        onSelect={(value) => update("persona", value)}
      />

      <Dropdown
        label="출처"
        allLabel="전체 출처"
        value={source}
        options={SOURCE_OPTIONS}
        onSelect={(value) => update("source", value)}
      />

      {/* 우측 = 보기 방식(마감 포함 토글 + 정렬). 좌측 = 결과를 좁히는 조건(지역·분야). */}
      <div className="ml-auto flex items-center gap-2 text-[14px]">
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
        <span aria-hidden="true" className="h-4 w-px bg-line" />
        <div className="flex items-center gap-1">
          <SortChip current={sort} value="deadline" label="마감임박순" onPick={update} />
          <SortChip current={sort} value="latest" label="최신순" onPick={update} />
        </div>
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

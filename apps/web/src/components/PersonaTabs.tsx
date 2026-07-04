"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PERSONA_TABS } from "@/lib/labels";

// 페르소나 진입 탭(차별점). 탭 전환 시 page는 1로 리셋. URL ?persona= 반영(SEO·공유).
export function PersonaTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("persona") ?? "";

  function select(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key) next.set("persona", key);
    else next.delete("persona");
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-hair">
      {PERSONA_TABS.map((tab) => {
        const active = current === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active}
            onClick={() => select(tab.key)}
            className={`press -mb-px whitespace-nowrap border-b-2 px-4 py-3 text-[15px] ${
              active
                ? "border-accent font-medium text-accent"
                : "border-transparent text-secondary hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

import type { OpportunityCard } from "@/lib/api";
import { dDayLabel, dDayTone } from "@/lib/labels";

// 부드러운 알약(직행 스타일) — 마감 긴급도는 톤(mint→coral)으로. 값은 서버 계산(status·dDay) 그대로 (AC-013).
const PILL_CLASS: Record<string, string> = {
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  muted: "bg-surface text-muted",
};

export function DDay({ item }: { item: OpportunityCard }) {
  return (
    <span
      className={`tnum inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ${PILL_CLASS[dDayTone(item)]}`}
    >
      {dDayLabel(item)}
    </span>
  );
}

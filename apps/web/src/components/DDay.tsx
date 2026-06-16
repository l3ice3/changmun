import type { OpportunityCard } from "@/lib/api";
import { dDayLabel, dDayTone } from "@/lib/labels";

const TONE_CLASS: Record<string, string> = {
  success: "text-success",
  danger: "text-danger",
  muted: "text-muted",
};

// 마감 긴급도는 D-day 색(mint→coral)으로만 드러낸다. 값은 서버 계산(status·dDay) 그대로 (AC-013).
export function DDay({ item }: { item: OpportunityCard }) {
  return (
    <span className={`tnum text-[12.5px] font-medium ${TONE_CLASS[dDayTone(item)]}`}>
      {dDayLabel(item)}
    </span>
  );
}

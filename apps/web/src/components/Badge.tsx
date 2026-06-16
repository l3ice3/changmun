import type { BadgeCode } from "@/lib/api";
import { BADGE_LABELS, BADGE_TONE } from "@/lib/labels";

const TONE_CLASS: Record<string, string> = {
  blue: "bg-surface-blue text-accent",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
  muted: "bg-surface text-muted",
};

export function Badge({ code }: { code: BadgeCode }) {
  return (
    <span
      className={`inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-medium ${TONE_CLASS[BADGE_TONE[code]]}`}
    >
      {BADGE_LABELS[code]}
    </span>
  );
}

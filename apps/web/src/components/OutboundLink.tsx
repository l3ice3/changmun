"use client";

import { track } from "@/lib/events";

interface Props {
  href: string;
  opportunityId: number;
  linkType: "apply" | "detail";
  primary?: boolean;
  children: React.ReactNode;
}

// 원문/신청 링크. 클릭 시 outbound_click 로깅(fire-and-forget, sendBeacon) — 이동은 항상 정상 (AC-026).
export function OutboundLink({ href, opportunityId, linkType, primary = false, children }: Props) {
  const className = primary
    ? "press flex h-11 w-full items-center justify-center rounded-lg bg-accent text-[14px] font-medium text-white hover:bg-accent-hover"
    : "press flex h-11 w-full items-center justify-center rounded-lg bg-surface-blue text-[14px] font-medium text-accent";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("outbound_click", { opportunityId, linkType })}
      className={className}
    >
      {children}
    </a>
  );
}

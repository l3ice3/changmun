"use client";

import { useEffect } from "react";
import { track } from "@/lib/events";

// detail_view 이벤트 (FR-007, AC-025).
export function DetailViewTracker({ opportunityId }: { opportunityId: number }) {
  useEffect(() => {
    track("detail_view", { opportunityId });
  }, [opportunityId]);
  return null;
}

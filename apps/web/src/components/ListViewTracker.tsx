"use client";

import { useEffect } from "react";
import { track } from "@/lib/events";

// list_view 이벤트 적재 (FR-007, AC-025). 화이트리스트 payload 키만.
export function ListViewTracker({
  payload,
}: {
  payload: Record<string, string | number>;
}) {
  const key = JSON.stringify(payload);
  useEffect(() => {
    track("list_view", payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

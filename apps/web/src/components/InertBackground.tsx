"use client";

import { useEffect, useRef } from "react";

// 풀스크린 오버레이 밖의 배경(사이드바·네비·푸터)을 inert 처리 — 오버레이가 시각적으로만
// 덮고 DOM엔 남아 있어, 키보드 tab이 보이지 않는 요소로 가는 것을 막는다 (Codex #44 P2).
// 자신의 조상 경로의 형제들만 inert — 표준 모달 포커스 격리 패턴. 언마운트 시 원복.
export function InertBackground() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const marked: Element[] = [];
    let node: HTMLElement | null = ref.current?.parentElement ?? null;
    while (node && node !== document.body) {
      const parent: HTMLElement | null = node.parentElement;
      if (!parent) break;
      for (const sibling of parent.children) {
        if (sibling !== node && !sibling.hasAttribute("inert")) {
          sibling.setAttribute("inert", "");
          marked.push(sibling);
        }
      }
      node = parent;
    }
    return () => marked.forEach((el) => el.removeAttribute("inert"));
  }, []);

  return <span ref={ref} hidden />;
}

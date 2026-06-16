"use client";

import { useState } from "react";
import type { GlossaryEntry } from "@/lib/api";

interface Segment {
  text: string;
  entry?: GlossaryEntry;
}

// 본문에서 등재 용어를 하이라이트 → 탭 시 쉬운 설명 (FR-004). 긴 용어 우선 매칭(부분 겹침 방지).
function split(text: string, terms: GlossaryEntry[]): Segment[] {
  if (terms.length === 0) return [{ text }];
  const sorted = [...terms].sort((left, right) => right.term.length - left.term.length);
  const segments: Segment[] = [];
  let buffer = "";
  let index = 0;
  while (index < text.length) {
    const match = sorted.find((entry) => entry.term.length > 0 && text.startsWith(entry.term, index));
    if (match) {
      if (buffer) {
        segments.push({ text: buffer });
        buffer = "";
      }
      segments.push({ text: match.term, entry: match });
      index += match.term.length;
    } else {
      buffer += text[index];
      index += 1;
    }
  }
  if (buffer) segments.push({ text: buffer });
  return segments;
}

export function GlossaryText({
  text,
  terms,
  className = "",
}: {
  text: string;
  terms: GlossaryEntry[];
  className?: string;
}) {
  const segments = split(text, terms);
  return (
    <p className={`whitespace-pre-line leading-relaxed ${className}`}>
      {segments.map((segment, position) =>
        segment.entry ? (
          <Term key={position} entry={segment.entry} />
        ) : (
          <span key={position}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

function Term({ entry }: { entry: GlossaryEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="font-medium text-accent underline decoration-dashed underline-offset-2"
      >
        {entry.term}
      </button>
      {open ? (
        <span className="absolute left-0 top-full z-20 mt-1 block w-60 rounded-lg border border-line bg-bg p-2.5 text-[12px] font-normal leading-relaxed text-secondary shadow-[0_1px_3px_rgba(25,31,40,0.08)]">
          {entry.description}
        </span>
      ) : null}
    </span>
  );
}

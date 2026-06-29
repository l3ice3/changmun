"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WindowMark } from "./WindowMark";

function ExploreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8z" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
      <circle cx="11" cy="11" r="6.5" />
      <line x1="16" y1="16" x2="20.5" y2="20.5" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
      <path
        d="M12 20.2l-1.3-1.2C6.3 15 4 12.9 4 10.2 4 8 5.7 6.3 7.8 6.3c1.2 0 2.4.6 3.2 1.5l1 1.1 1-1.1c.8-.9 2-1.5 3.2-1.5 2.1 0 3.8 1.7 3.8 3.9 0 2.7-2.3 4.8-6.7 8.8z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ITEMS = [
  { href: "/", label: "탐색", Icon: ExploreIcon },
  { href: "/search", label: "검색", Icon: SearchIcon },
  { href: "/bookmarks", label: "찜", Icon: HeartIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

// 직행식 좌측 고정 사이드바 — 데스크톱(≥lg)에서만. 모바일은 상단 Nav가 대신한다.
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[84px] shrink-0 flex-col items-center border-r border-hair bg-bg py-4 lg:flex">
      <Link href="/" aria-label="창문 홈" className="press mb-6">
        <WindowMark className="h-8 w-8" />
      </Link>
      <nav className="flex flex-col gap-1.5">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`press flex w-[64px] flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] ${
                active
                  ? "bg-surface-blue font-medium text-accent"
                  : "text-muted hover:bg-surface hover:text-secondary"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

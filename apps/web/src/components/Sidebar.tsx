"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { WindowMark } from "./WindowMark";

function ExploreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
      <circle cx="12" cy="12" r="8.5" />
      <path
        d="M12 6.5 13.5 10.5 17.5 12 13.5 13.5 12 17.5 10.5 13.5 6.5 12 10.5 10.5z"
        strokeLinejoin="round"
      />
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

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L5 20V5a1 1 0 0 1 1-1z" strokeLinejoin="round" />
    </svg>
  );
}

const ITEMS = [
  { href: "/", label: "탐색", Icon: ExploreIcon },
  { href: "/search", label: "검색", Icon: SearchIcon },
  { href: "/bookmarks", label: "찜", Icon: BookmarkIcon },
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
      {/* 로고와 메뉴·아이템 사이 간격은 넉넉하게 — 촘촘함 해소 (QA #17). */}
      <Link href="/" aria-label="창문 홈" className="press mb-10">
        <WindowMark className="h-10 w-10" />
      </Link>
      <nav className="flex flex-col gap-4">
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
      <ThemeToggle />
    </aside>
  );
}

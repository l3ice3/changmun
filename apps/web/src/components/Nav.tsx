"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WindowMark } from "./WindowMark";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/search", label: "검색" },
  { href: "/bookmarks", label: "찜" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-hair bg-bg/90 backdrop-blur lg:hidden">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4">
        <Link href="/" className="press flex items-center gap-2">
          <WindowMark className="h-7 w-7" />
          <span className="brand-logo text-[20px] text-hero">창문</span>
        </Link>
        <nav className="flex items-center gap-1 text-[14px]">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 ${
                isActive(pathname, link.href)
                  ? "font-medium text-accent"
                  : "text-secondary hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

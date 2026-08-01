"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthMenu } from "./AuthMenu";
import { BrandWordmark } from "./BrandWordmark";
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
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4">
        {/* 락업 = 마크(색) + 심플 워드마크(단색) — 팀 피드백으로 마크 복귀 (QA #30) */}
        <Link href="/" className="press flex items-center gap-2">
          <WindowMark className="h-7 w-7" />
          <BrandWordmark className="h-[17px] w-auto text-hero" />
        </Link>
        <div className="flex items-center gap-1.5">
          <nav className="flex items-center gap-1 text-[14px]">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-2.5 py-1.5 ${
                  isActive(pathname, link.href)
                    ? "font-medium text-accent"
                    : "text-secondary hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <AuthMenu />
        </div>
      </div>
    </header>
  );
}

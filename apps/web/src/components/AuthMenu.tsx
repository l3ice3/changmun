"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { getMe, logout, resetMe, type Me } from "@/lib/auth";
import { resetBookmarkIds } from "@/lib/bookmarks";

const ANONYMOUS: Me = { authenticated: false, email: null, provider: null };

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  kakao: "카카오",
  naver: "네이버",
};

// 로그인 상태 표시 — 비로그인이면 '로그인' 링크, 로그인이면 아바타 → 드롭다운 메뉴
// (프로필 헤더 + 마이페이지·찜한 공고 + 로그아웃 — 로그아웃은 메뉴 안으로, QA #25 인프런식).
export function AuthMenu() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getMe().then((result) => {
      if (active) setMe(result);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 로딩 중엔 아무것도 렌더하지 않아 로그인↔유저 깜빡임을 막는다.
  if (me === null) {
    return null;
  }

  if (!me.authenticated) {
    return (
      <Link
        href="/login"
        className="press rounded-full btn-sheen px-5 py-2.5 text-[14px] font-medium text-white"
      >
        로그인
      </Link>
    );
  }

  async function onLogout() {
    setOpen(false);
    await logout();
    resetMe();
    resetBookmarkIds();
    setMe(ANONYMOUS);
    router.push("/");
  }

  function closeThen() {
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="내 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="press block rounded-full"
      >
        <Avatar size={36} />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-pop-in absolute right-0 top-full z-40 mt-2 w-[240px] rounded-[14px] border border-line bg-bg p-2 shadow-[0_12px_40px_rgba(25,31,40,0.18)]"
        >
          <Link
            href="/me"
            role="menuitem"
            onClick={closeThen}
            className="flex items-center gap-3 rounded-[10px] px-3 py-3 hover:bg-surface"
          >
            <Avatar size={40} />
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-medium text-ink">{me.email}</span>
              <span className="block text-[12px] text-muted">
                {PROVIDER_LABELS[me.provider ?? ""] ?? me.provider} 로그인
              </span>
            </span>
          </Link>

          <div className="my-1.5 border-t border-hair" />

          <Link
            href="/me"
            role="menuitem"
            onClick={closeThen}
            className="block rounded-[10px] px-3 py-2.5 text-[13.5px] text-secondary hover:bg-surface hover:text-ink"
          >
            마이페이지
          </Link>
          <Link
            href="/bookmarks"
            role="menuitem"
            onClick={closeThen}
            className="block rounded-[10px] px-3 py-2.5 text-[13.5px] text-secondary hover:bg-surface hover:text-ink"
          >
            찜한 공고
          </Link>

          <div className="my-1.5 border-t border-hair" />

          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="block w-full rounded-[10px] px-3 py-2.5 text-left text-[13.5px] text-muted hover:bg-surface hover:text-secondary"
          >
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  );
}

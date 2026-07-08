"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { getMe, logout, type Me } from "@/lib/auth";
import { resetBookmarkIds } from "@/lib/bookmarks";

const ANONYMOUS: Me = { authenticated: false, email: null, provider: null };

// 로그인 상태 표시 — 비로그인이면 '로그인' 링크, 로그인이면 이메일 + 로그아웃. /me는 credentials include로 세션 확인.
export function AuthMenu() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let active = true;
    getMe().then((result) => {
      if (active) setMe(result);
    });
    return () => {
      active = false;
    };
  }, []);

  // 로딩 중엔 아무것도 렌더하지 않아 로그인↔유저 깜빡임을 막는다.
  if (me === null) {
    return null;
  }

  if (!me.authenticated) {
    return (
      <Link
        href="/login"
        className="press rounded-full bg-mark-deep px-5 py-2.5 text-[14px] font-medium text-white hover:bg-accent"
      >
        로그인
      </Link>
    );
  }

  async function onLogout() {
    await logout();
    resetBookmarkIds();
    setMe(ANONYMOUS);
  }

  // 이메일 텍스트 대신 프로필 아바타 — 클릭하면 마이페이지(QA #24).
  return (
    <div className="flex items-center gap-2.5">
      <Link href="/me" aria-label="마이페이지" className="press rounded-full">
        <Avatar size={36} />
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="press rounded-full bg-surface px-4 py-2.5 text-[14px] text-muted hover:text-secondary"
      >
        로그아웃
      </button>
    </div>
  );
}

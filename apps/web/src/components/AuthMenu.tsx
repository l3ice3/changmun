"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMe, logout, type Me } from "@/lib/auth";

const ANONYMOUS: Me = { authenticated: false, email: null, provider: null };

// 로그인 상태 표시 — 비로그인이면 '로그인' 링크, 로그인이면 이메일 + 로그아웃. /me는 credentials include로 세션 확인.
export function AuthMenu() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let active = true;
    fetchMe().then((result) => {
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
        className="press rounded-full bg-surface px-3.5 py-1.5 text-[13px] font-medium text-secondary hover:bg-surface-blue hover:text-accent"
      >
        로그인
      </Link>
    );
  }

  async function onLogout() {
    await logout();
    setMe(ANONYMOUS);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[160px] truncate text-[13px] text-secondary">{me.email}</span>
      <button
        type="button"
        onClick={onLogout}
        className="press rounded-full bg-surface px-3 py-1.5 text-[13px] text-muted hover:text-secondary"
      >
        로그아웃
      </button>
    </div>
  );
}

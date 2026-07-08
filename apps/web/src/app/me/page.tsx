"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { getMe, logout, resetMe, type Me } from "@/lib/auth";
import { resetBookmarkIds } from "@/lib/bookmarks";
import {
  removeProfileImage,
  uploadProfileImage,
  validateProfileImage,
} from "@/lib/profile";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  kakao: "카카오",
  naver: "네이버",
};

// 마이페이지 — 프로필 이미지(업로드 1MB·기본으로 되돌리기) + 계정 정보 + 로그아웃 (QA #24, 팀 합의 스코프 확장).
export default function MyPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getMe().then((result) => {
      if (active) setMe(result);
    });
    return () => {
      active = false;
    };
  }, []);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // 같은 파일 재선택도 change로 잡히게 초기화
    if (!file) return;
    const invalid = validateProfileImage(file);
    if (invalid) {
      setMessage(invalid);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await uploadProfileImage(file);
      setVersion((v) => v + 1);
      setMessage("프로필 이미지가 변경됐어요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setBusy(true);
    setMessage(null);
    try {
      await removeProfileImage();
      setVersion((v) => v + 1);
      setMessage("기본 이미지로 되돌렸어요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await logout();
    resetMe();
    resetBookmarkIds();
    router.push("/");
  }

  if (me === null) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-16">
        <div className="h-40 animate-pulse rounded-[14px] border-[0.5px] border-line bg-surface" />
      </div>
    );
  }

  if (!me.authenticated) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-24 text-center">
        <h1 className="text-[21px] font-semibold tracking-tight">로그인이 필요해요</h1>
        <p className="mt-2 text-[14px] text-muted">마이페이지는 로그인 후 이용할 수 있어요.</p>
        <Link
          href="/login"
          className="press mt-6 inline-flex h-11 items-center rounded-full bg-accent px-6 text-[14px] font-medium text-white hover:bg-accent-hover"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px] px-4 py-14">
      <h1 className="text-[24px] font-semibold tracking-tight">마이페이지</h1>

      <section className="mt-8 rounded-[14px] border border-line bg-surface px-6 py-8">
        <div className="flex flex-col items-center">
          <Avatar size={96} version={version} />
          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              className="press rounded-full bg-accent px-4 py-2 text-[13.5px] font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              사진 변경
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReset}
              className="press rounded-full bg-bg px-4 py-2 text-[13.5px] text-secondary hover:text-ink disabled:opacity-50"
            >
              기본 이미지로
            </button>
          </div>
          <p className="mt-3 text-[12px] text-muted">JPEG·PNG·WebP, 1MB 이하</p>
          {message ? <p className="mt-2 text-[12.5px] text-accent">{message}</p> : null}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            className="hidden"
          />
        </div>
      </section>

      <section className="mt-4 rounded-[14px] border border-line bg-surface px-6 py-5">
        <dl className="space-y-3 text-[14px]">
          <div className="flex items-center justify-between">
            <dt className="text-muted">이메일</dt>
            <dd className="text-ink">{me.email ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">로그인 방식</dt>
            <dd className="text-ink">{PROVIDER_LABELS[me.provider ?? ""] ?? me.provider}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onLogout}
          className="press rounded-full bg-surface px-5 py-2.5 text-[13.5px] text-muted hover:text-secondary"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

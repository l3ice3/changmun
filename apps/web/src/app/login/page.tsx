import type { Metadata } from "next";
import Link from "next/link";
import { loginUrl, PROVIDERS } from "@/lib/auth";
import { ProviderIcon } from "@/components/ProviderIcon";
import { WindowMark } from "@/components/WindowMark";

export const metadata: Metadata = {
  title: "로그인",
  description: "창문 로그인 — 로그인하면 찜한 공고가 기기 간에 동기화돼요(로그인은 선택).",
};

// 주 로그인은 Google(단일 큰 버튼), 나머지는 아이콘 행 — 한국 사용자 접점 순서(네이버·카카오·GitHub).
const SECONDARY_ORDER: Record<string, number> = { naver: 0, kakao: 1, github: 2 };
const secondary = PROVIDERS.filter((p) => p.id !== "google")
  .slice()
  .sort((a, b) => SECONDARY_ORDER[a.id] - SECONDARY_ORDER[b.id]);

// 풀스크린 몰입 로그인 — fixed 오버레이로 사이드바·네비·푸터를 덮는다(레이아웃 재구조화 없이).
// hero-sea는 position:relative를 선언하므로 fixed 래퍼와 같은 요소에 두면 안 된다(래퍼 분리).
// hero-sea(딥 네이비)는 항상-어두움 영역이라 카드의 white/* 고정색 허용(web.md 8).
export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-50">
      <div className="hero-sea h-full w-full overflow-y-auto">
        <Link href="/" className="absolute left-5 top-5 z-10 flex items-center gap-2">
          <WindowMark className="h-8 w-8" />
          <span className="brand-logo text-[20px] text-hero">창문</span>
        </Link>

        <div className="flex min-h-full items-center justify-center px-4 py-16">
          <section className="w-full max-w-[360px] rounded-[22px] border border-white/12 bg-white/[0.07] px-6 py-10 text-center backdrop-blur-xl sm:px-8">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white shadow-lg">
              <WindowMark className="h-9 w-9" />
            </span>

            <p className="mt-6 text-[12px] font-medium tracking-wide text-hero-label">
              K-Startup·기업마당·온통청년의 모든 공고
            </p>
            <h1 className="mt-2 text-[24px] font-semibold leading-snug tracking-tight text-hero-text">
              흩어진 창업 지원금,
              <br />
              한번에 한곳에서
            </h1>

            <a
              href={loginUrl("google")}
              className="press mt-9 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-white text-[14px] font-semibold text-[#191f28] hover:bg-white/90"
            >
              <ProviderIcon id="google" plain />
              Google로 계속하기
            </a>

            <div className="mt-5 flex items-center justify-center divide-x divide-white/15">
              {secondary.map((provider) => (
                <a
                  key={provider.id}
                  href={loginUrl(provider.id)}
                  className="press flex items-center gap-2 whitespace-nowrap px-3.5 text-[13px] font-medium text-hero-sub hover:text-hero-text"
                >
                  <ProviderIcon id={provider.id} size="md" />
                  {provider.label}
                </a>
              ))}
            </div>

            <p className="mt-9 text-[11px] leading-relaxed text-hero-label">
              로그인 시 이메일·계정 식별 정보만 저장하며,
              <br />
              자세한 내용은 개인정보처리방침을 따릅니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

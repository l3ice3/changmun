import type { Metadata } from "next";
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

// 홈 히어로와 같은 hero-sea(딥 네이비) 패널 — 항상-어두움 영역이라 카드의 white/* 고정색 허용(web.md 8).
export default function LoginPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-3.5 py-4">
      <section className="hero-sea flex min-h-[72dvh] items-center justify-center rounded-[18px] px-4 py-14">
        <div className="w-full max-w-[360px] rounded-[22px] border border-white/12 bg-white/[0.07] px-6 py-10 text-center backdrop-blur-xl sm:px-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white shadow-lg">
            <WindowMark className="h-9 w-9" />
          </span>

          <p className="mt-5 text-[12px] font-medium tracking-wide text-hero-label">
            창업의 문을 여는 창
          </p>
          <h1 className="mt-1.5 text-[22px] font-semibold leading-snug tracking-tight text-hero-text">
            찜한 공고를
            <br />
            어느 기기에서나
          </h1>
          <p className="mt-3 text-[12.5px] leading-relaxed text-hero-sub">
            로그인하면 찜한 공고가 기기 간에 동기화돼요.
            <br />
            로그인 없이도 모든 기능을 그대로 사용할 수 있어요.
          </p>

          <a
            href={loginUrl("google")}
            className="press mt-8 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-white text-[14px] font-semibold text-[#191f28] hover:bg-white/90"
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

          <p className="mt-8 text-[11px] leading-relaxed text-hero-label">
            로그인 시 이메일·계정 식별 정보만 저장하며,
            <br />
            자세한 내용은 개인정보처리방침을 따릅니다.
          </p>
        </div>
      </section>
    </div>
  );
}

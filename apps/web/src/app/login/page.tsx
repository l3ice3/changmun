import type { Metadata } from "next";
import Link from "next/link";
import { loginUrl, PROVIDERS } from "@/lib/auth";
import { BrandWordmark } from "@/components/BrandWordmark";
import { InertBackground } from "@/components/InertBackground";
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
    // 스크롤은 fixed 래퍼가 담당 — .hero-sea의 overflow:hidden이 같은 요소의
    // overflow-y-auto를 덮어써 저높이 화면에서 스크롤이 막히던 문제 방지 (Codex #44).
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 오버레이 뒤 사이드바·네비·푸터를 tab order에서 제외 (Codex #44). */}
      <InertBackground />
      {/* 로고 링크는 hero-sea 밖(형제)에 — .hero-sea > *가 position/z-index를 덮어써
          카드 래퍼가 클릭을 가로채는 버그 방지(홈 복귀가 안 되던 원인). */}
      {/* 글자 속 ㅁ이 곧 창문 — 좌상단은 워드마크만(마크 중복 제거, 팀 합의).
          밝은 물결 배경 위 — 항상 밝은 잉크(onDark) + 은은한 드롭섀도(QA #17 유지). */}
      <Link href="/" className="absolute left-8 top-7 z-10 flex items-center">
        <BrandWordmark
          tone="onDark"
          className="h-[19px] w-auto [filter:drop-shadow(0_1px_10px_rgba(10,20,50,0.55))]"
        />
      </Link>
      {/* pt-24 = 상단 로고 영역(≈68px) 예약 — 저높이 모바일에서 카드와 로고 겹침 방지 (Codex #46). */}
      <div className="hero-sea flex min-h-full w-full items-center justify-center px-4 pb-14 pt-24">
          <section className="w-full max-w-[560px] rounded-[24px] border border-white/12 bg-white/[0.07] px-6 py-12 text-center backdrop-blur-xl sm:px-14 sm:py-24">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white shadow-lg">
              <WindowMark className="h-10 w-10" />
            </span>

            <p className="mt-8 text-[13px] font-medium tracking-wide text-hero-label">
              K-Startup·기업마당·온통청년을 한곳에
            </p>
            <h1 className="mt-2.5 text-[27px] font-semibold leading-snug tracking-tight text-hero-text sm:text-[32px]">
              창업의 문을 여는 창,
              <br />내 단계에 맞는 지원금만
            </h1>

            <a
              href={loginUrl("google")}
              className="press mx-auto mt-12 flex h-[52px] w-full max-w-[400px] items-center justify-center gap-2.5 rounded-xl bg-white text-[15px] font-semibold text-[#191f28] hover:bg-white/90"
            >
              <ProviderIcon id="google" plain />
              Google로 계속하기
            </a>

            <div className="mt-9 flex items-center justify-center divide-x divide-white/15">
              {secondary.map((provider) => (
                <a
                  key={provider.id}
                  href={loginUrl(provider.id)}
                  className="press flex items-center gap-2.5 whitespace-nowrap px-6 text-[14px] font-medium text-hero-sub hover:text-hero-text"
                >
                  <ProviderIcon id={provider.id} size="md" />
                  {provider.label}
                </a>
              ))}
            </div>

            {/* 만 14세 고지 — privacy 제13조("로그인 화면에 고지")와 1:1 대응 (Codex #56 P2). */}
            <p className="mt-14 text-[12px] leading-relaxed text-hero-label">
              로그인은 만 14세 이상만 가능합니다. 로그인 시 이메일·계정 식별 정보만 저장하며,
              <br />
              자세한 내용은{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-hero-text">
                개인정보처리방침
              </Link>
              을 따릅니다.
            </p>
          </section>
      </div>
    </div>
  );
}

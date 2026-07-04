import type { Metadata } from "next";
import { loginUrl, PROVIDERS } from "@/lib/auth";
import { WindowMark } from "@/components/WindowMark";

export const metadata: Metadata = {
  title: "로그인",
  description: "창문 로그인 — 로그인하면 찜이 기기 간에 동기화됩니다.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <WindowMark className="mx-auto h-12 w-12" />
      <h1 className="brand-logo mt-4 text-[26px] text-hero">창문</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        로그인하면 찜한 공고가 기기 간에 동기화돼요.
        <br />
        로그인 없이도 모든 기능을 그대로 사용할 수 있어요.
      </p>

      <div className="mt-8 flex flex-col gap-2.5">
        {PROVIDERS.map((provider) => (
          <a
            key={provider.id}
            href={loginUrl(provider.id)}
            className="press flex h-12 items-center justify-center rounded-xl border border-line bg-surface text-[14px] font-medium text-secondary hover:border-edge hover:text-ink"
          >
            {provider.label}로 계속하기
          </a>
        ))}
      </div>

      <p className="mt-6 text-[11.5px] text-dim">
        로그인 시 이메일·계정 식별 정보만 저장하며, 자세한 내용은 개인정보처리방침을 따릅니다.
      </p>
    </div>
  );
}

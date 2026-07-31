import type { Metadata } from "next";
import Link from "next/link";
import { BrandWordmark } from "@/components/BrandWordmark";
import { WindowMark } from "@/components/WindowMark";
import { COMPANY } from "@/lib/links";

export const metadata: Metadata = {
  title: "서비스 소개",
  description:
    "창문 — 흩어진 창업 지원금을 한곳에 모아, 내 창업 단계에 맞는 것만 골라주는 지원금 전담 비서.",
};

// 카피 가드레일(절대규칙 9): 합격 보장 표현 금지 — "신청 자격" 언어로 통일(AC-015).
const VALUES = [
  {
    // 수집 현황과 일치시킬 것(Codex #54 P3): 기업마당은 수집 개시 전 — 켜지면 "매일 한곳에" 단정형으로 갱신.
    title: "한곳에 모아",
    body: "K-Startup·온통청년에 흩어진 정부 지원사업을 매일 한곳에 모읍니다. 기업마당 공고도 곧 합류해요 — 더 이상 포털을 오가며 찾지 않아도 됩니다.",
  },
  {
    title: "내 단계에 맞게",
    body: "예비창업자·대학생·초기창업자 — 내 창업 단계에 맞는, 지금 신청 자격이 되는 공고만 골라 보여드립니다.",
  },
  {
    title: "끝까지 동행",
    body: "찾는 건 이미 정부 포털이 끝냈습니다. 우리는 “그래서 나는 무엇에 신청 자격이 되고, 어떻게 따는가”에 끝까지 동행합니다.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-14">
      <div className="flex items-center gap-3">
        <WindowMark className="h-11 w-11" />
        <BrandWordmark className="h-[24px] w-auto" />
      </div>

      <h1 className="mt-8 text-[27px] font-semibold leading-snug tracking-tight text-ink">
        막막한 창업을 들여다보는 창(窓),
        <br />그 문(門)을 여는 지원금 전담 비서
      </h1>

      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-secondary">
        <p>
          우리의 미션은 예비·초기 창업자에게 <strong className="text-ink">&lsquo;창업의 문(門)&rsquo;</strong>을
          열어드리는 것입니다.
        </p>
        <p>
          막막한 창업 세계를 들여다보는 창(窓)이자, 그 문을 직접 열어주는 서비스 — 흩어진 창업
          지원금을 한곳에 모으고, 내 창업 단계를 기억해{" "}
          <strong className="text-ink">&lsquo;지금 신청 자격이 되는 지원금&rsquo;</strong>을 골라주는
          지원금 전담 비서를 만듭니다.
        </p>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {VALUES.map((value) => (
          <div key={value.title} className="rounded-[14px] border border-line bg-surface px-5 py-6">
            <h2 className="text-[15px] font-semibold text-ink">{value.title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-secondary">{value.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-[14px] bg-surface-blue px-6 py-6">
        <p className="text-[14px] leading-relaxed text-secondary">
          지금 바로 내 단계에 맞는 공고를 둘러보세요.
        </p>
        <Link
          href="/search"
          className="press mt-3 inline-flex h-11 items-center rounded-full bg-accent px-6 text-[14px] font-medium text-white hover:bg-accent-hover"
        >
          공고 탐색하기
        </Link>
      </div>

      <p className="mt-10 text-[13px] leading-relaxed text-muted">
        질문이 있으신가요?{" "}
        <a href={`mailto:${COMPANY.email}`} className="text-accent underline underline-offset-2">
          {COMPANY.email}
        </a>
        로 알려주세요.
      </p>
    </div>
  );
}

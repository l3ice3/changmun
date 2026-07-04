import Link from "next/link";
import { COMPANY, FOOTER_LINKS, type SiteLink } from "@/lib/links";
import { WindowMark } from "./WindowMark";

// 브랜드 미션 voice. 카피 가드레일 준수(합격 보장 표현 금지) — "내 단계에 맞는 것만 골라" 표현.
const SLOGAN = "막막한 창업을 들여다보는 창(窓), 그 문(門)을 여는 지원금 전담 비서.";
const SUB = "흩어진 정부 지원금을 한곳에 모아, 내 창업 단계에 맞는 것만 골라드려요.";

function FooterLink({ link }: { link: SiteLink }) {
  if (!link.url) {
    return (
      <span className="cursor-default text-muted/70" title="준비 중">
        {link.label}
      </span>
    );
  }
  // 내부 페이지("/" 시작)는 같은 탭 내비게이션, 외부(노션 등)는 새 탭.
  if (link.url.startsWith("/")) {
    return (
      <Link href={link.url} className="text-secondary hover:text-accent">
        {link.label}
      </Link>
    );
  }
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-secondary hover:text-accent"
    >
      {link.label}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-hair bg-bg-alt">
      <div className="mx-auto max-w-[1400px] px-4 py-12">
        <div className="flex items-center gap-2.5">
          <WindowMark className="h-7 w-7" />
          <span className="brand-logo text-[22px] text-hero">창문</span>
        </div>
        <p className="mt-4 max-w-xl text-[14px] font-medium leading-relaxed text-secondary">
          {SLOGAN}
        </p>
        <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-muted">{SUB}</p>

        <div className="mt-9 flex flex-col gap-5 border-t border-hair pt-6 sm:flex-row sm:items-start sm:justify-between">
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] font-medium">
            {FOOTER_LINKS.map((link, index) => (
              <span key={link.label} className="flex items-center gap-x-3">
                {index > 0 ? (
                  <span className="text-strong" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <FooterLink link={link} />
              </span>
            ))}
          </nav>
          <div className="space-y-1 text-[11.5px] leading-relaxed text-dim sm:text-right">
            <p>
              {COMPANY.legalName} <span className="text-muted">({COMPANY.status})</span> · 대표{" "}
              {COMPANY.rep} · {COMPANY.email}
            </p>
            <p>
              {COMPANY.address} · 사업자등록 {COMPANY.bizNo}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-hair">
        <div className="mx-auto max-w-[1400px] px-4 py-4 text-[11px] text-dim">
          공고 정보는 공공 API에서 수집한 참고용입니다. 신청 자격·합격 여부는 각 공고 원문과 주관기관 안내를
          확인하세요.
        </div>
      </div>
    </footer>
  );
}

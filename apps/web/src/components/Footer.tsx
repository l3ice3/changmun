import { COMPANY, FOOTER_LINKS, type SiteLink } from "@/lib/links";
import { WindowMark } from "./WindowMark";

const SLOGAN = "창문을 열면, 내게 맞는 정부 지원금이 보입니다.";

function FooterLink({ link }: { link: SiteLink }) {
  if (!link.url) {
    return (
      <span className="cursor-default text-muted/70" title="준비 중">
        {link.label}
      </span>
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
      <div className="mx-auto max-w-[1200px] px-4 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="flex items-start gap-2">
            <WindowMark className="h-6 w-6" />
            <div>
              <div className="brand-logo text-[18px] text-hero">창문</div>
              <p className="mt-1.5 max-w-xs text-[12px] leading-relaxed text-muted">{SLOGAN}</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] font-medium">
            {FOOTER_LINKS.map((link) => (
              <FooterLink key={link.label} link={link} />
            ))}
          </nav>
        </div>

        <div className="mt-8 space-y-1 text-[11.5px] leading-relaxed text-dim">
          <p>
            {COMPANY.legalName} <span className="text-muted">({COMPANY.status})</span> · 대표{" "}
            {COMPANY.rep} · {COMPANY.email}
          </p>
          <p>
            {COMPANY.address} · 사업자등록 {COMPANY.bizNo}
          </p>
        </div>
      </div>

      <div className="border-t border-hair">
        <div className="mx-auto max-w-[1200px] px-4 py-4 text-[11px] text-dim">
          공고 정보는 공공 API에서 수집한 참고용입니다. 신청 자격·합격 여부는 각 공고 원문과 주관기관 안내를
          확인하세요.
        </div>
      </div>
    </footer>
  );
}

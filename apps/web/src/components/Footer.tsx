import { WindowMark } from "./WindowMark";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-hair bg-bg-alt">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <div className="flex items-start gap-2">
          <WindowMark className="h-6 w-6" />
          <div>
            <div className="text-[14px] font-medium">창문</div>
            <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-muted">
              흩어진 정부 창업 지원금을 한 곳에서. 내 단계에 맞는 공고만 골라 봅니다.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-[12px] text-muted">
          <a href="/" className="hover:text-secondary">
            전체 공고
          </a>
          <a href="/search" className="hover:text-secondary">
            검색
          </a>
          <a href="/bookmarks" className="hover:text-secondary">
            찜한 공고
          </a>
          <span>K-Startup · 기업마당 · 온통청년</span>
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

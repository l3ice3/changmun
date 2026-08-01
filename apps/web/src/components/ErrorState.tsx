import Link from "next/link";

// 서버/네트워크 오류 — 안내 + 재시도 (PRD §9). 로깅 API 실패는 예외(조용히 무시).
export function ErrorState({ retryHref }: { retryHref: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line bg-bg-alt px-6 py-16 text-center">
      <p className="text-[15px] font-medium text-ink">공고를 불러오지 못했어요</p>
      <p className="mt-1 text-[13px] text-muted">
        잠시 후 다시 시도해주세요. 문제가 계속되면 네트워크 상태를 확인해주세요.
      </p>
      <Link
        href={retryHref}
        className="press mt-5 rounded-lg btn-sheen px-4 py-2 text-[13px] font-medium text-white"
      >
        다시 시도
      </Link>
    </div>
  );
}

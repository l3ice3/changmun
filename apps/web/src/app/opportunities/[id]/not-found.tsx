import Link from "next/link";

// 존재하지 않는 공고 — 전용 404 (AC-016). 빈 화면·무한로딩 금지.
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col items-center px-3.5 py-24 text-center">
      <p className="tnum text-[40px] font-semibold text-edge">404</p>
      <h1 className="mt-2 text-[18px] font-medium">공고를 찾을 수 없어요</h1>
      <p className="mt-1 text-[13px] text-muted">
        마감되어 내려갔거나 잘못된 주소일 수 있어요.
      </p>
      <Link
        href="/"
        className="press mt-6 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white"
      >
        진행 중인 공고 보기
      </Link>
    </div>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col items-center px-3.5 py-24 text-center">
      <p className="tnum text-[40px] font-semibold text-edge">404</p>
      <h1 className="mt-2 text-[18px] font-medium">페이지를 찾을 수 없어요</h1>
      <Link
        href="/"
        className="press mt-6 rounded-lg btn-sheen px-4 py-2 text-[13px] font-medium text-white"
      >
        홈으로
      </Link>
    </div>
  );
}

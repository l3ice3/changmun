import type { Metadata } from "next";
import { NOTICES } from "@/lib/notices";

export const metadata: Metadata = {
  title: "공지사항",
  description: "창문 서비스 소식과 업데이트 안내.",
};

export default function NoticesPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-14">
      <h1 className="text-[24px] font-semibold tracking-tight">공지사항</h1>
      <p className="mt-2 text-[13.5px] text-muted">창문의 소식과 업데이트를 알려드려요.</p>

      <div className="mt-8 space-y-4">
        {NOTICES.map((notice) => (
          <article
            key={notice.slug}
            id={notice.slug}
            className="rounded-[14px] border border-line bg-surface px-6 py-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[16.5px] font-semibold text-ink">{notice.title}</h2>
              <time dateTime={notice.date} className="tnum text-[12.5px] text-muted">
                {notice.date}
              </time>
            </div>
            <div className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-secondary">
              {notice.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>

      {NOTICES.length === 0 ? (
        <p className="mt-8 rounded-[14px] border border-line bg-surface px-4 py-10 text-center text-[13px] text-muted">
          아직 등록된 공지가 없어요.
        </p>
      ) : null}
    </div>
  );
}

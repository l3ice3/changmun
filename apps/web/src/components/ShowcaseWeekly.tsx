import Link from "next/link";
import { fetchShowcaseWeekly, type ShowcaseCard } from "@/lib/showcase";
import { ShowcaseProductCard } from "./ShowcaseProductCard";

// 홈 주간 모아보기 — "이번 주 새로 열린 창"(기획안 S-5). 서버 프리페치, 비어 있거나 API 불통이면
// 섹션 자체를 숨긴다(홈은 공고가 본체 — 쇼케이스는 보조 섹션).
export async function ShowcaseWeekly() {
  let items: ShowcaseCard[] = [];
  try {
    items = await fetchShowcaseWeekly();
  } catch {
    return null;
  }
  if (items.length === 0) {
    return null;
  }
  return (
    <section className="mt-14">
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-semibold tracking-tight text-ink">
          이번 주 새로 열린 <span className="text-accent">창</span>
        </h2>
        <Link href="/showcase" className="text-[13.5px] font-medium text-muted hover:text-secondary">
          쇼케이스 더 보기 ›
        </Link>
      </div>
      <p className="mt-1 text-[13.5px] text-secondary">
        창문 창업자들이 이번 주에 공개한 제품이에요. 응원 한 번이 큰 힘이 돼요.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ShowcaseProductCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { ShowcaseEditor } from "@/components/ShowcaseEditor";

export const metadata: Metadata = {
  title: "제품 올리기 · 쇼케이스",
  description: "창문 쇼케이스에 내 제품·서비스를 등록해 창업자들에게 알려보세요.",
};

export default function ShowcaseNewPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-3.5 py-7">
      <h1 className="text-[21px] font-semibold tracking-tight">내 제품 올리기</h1>
      <p className="mt-1 text-[13.5px] text-secondary">
        창문을 쓰는 창업자·대학생들에게 내 제품을 소개해 보세요. 등록하면 팀 검수 후 공개돼요.
      </p>
      <ShowcaseEditor />
    </div>
  );
}

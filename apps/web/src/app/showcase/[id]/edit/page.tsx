"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ShowcaseEditor } from "@/components/ShowcaseEditor";
import { fetchShowcaseEditView, type ShowcaseEditable } from "@/lib/showcase";

// 쇼케이스 수정 — 소유자 편집용 조회(검수 상태 무관, 서버가 소유자 검증)를 폼에 채운다.
export default function ShowcaseEditPage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);
  const [detail, setDetail] = useState<ShowcaseEditable | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetchShowcaseEditView(productId)
      .then(setDetail)
      .catch(() => setMissing(true));
  }, [productId]);

  if (missing) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-14">
        <EmptyState
          title="수정할 제품을 찾을 수 없어요"
          message="내가 등록한 제품만 수정할 수 있어요. 로그인 상태를 확인해 주세요."
          ctaHref="/showcase/mine"
          ctaLabel="내 등록 제품 보기"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-3.5 py-7">
      <h1 className="text-[21px] font-semibold tracking-tight">제품 수정</h1>
      <p className="mt-1 text-[13.5px] text-secondary">수정하면 다시 검수를 받은 뒤 공개돼요.</p>
      {detail === null ? (
        <p className="py-16 text-center text-[13px] text-muted">불러오는 중…</p>
      ) : (
        <ShowcaseEditor initial={detail} />
      )}
    </div>
  );
}

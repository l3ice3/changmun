"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { getMe } from "@/lib/auth";
import {
  deleteShowcase,
  fetchShowcaseMine,
  SHOWCASE_CATEGORY_LABELS,
  SHOWCASE_STATUS_LABELS,
  type ShowcaseMine,
} from "@/lib/showcase";

// 내 등록 제품 — 검수 상태(검수 중/공개 중/반려+사유)를 본인에게만 보여준다.
export default function ShowcaseMinePage() {
  return (
    <Suspense>
      <MineContent />
    </Suspense>
  );
}

function MineContent() {
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get("submitted") === "1";
  const [items, setItems] = useState<ShowcaseMine[] | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    getMe().then((me) => {
      setAuthed(me.authenticated);
      if (!me.authenticated) return;
      fetchShowcaseMine()
        .then(setItems)
        .catch(() => setItems([]));
    });
  }, []);

  // 성공했을 때만 목록에서 제거 — 실패를 성공처럼 처리하지 않는다(Codex #78 P2).
  async function onDelete(id: number) {
    if (!window.confirm("제품을 삭제할까요?")) return;
    setActionError(null);
    try {
      await deleteShowcase(id);
      setItems((prev) => (prev ? prev.filter((item) => item.id !== id) : prev));
    } catch {
      setActionError("삭제에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-3.5 py-7">
      <h1 className="text-[21px] font-semibold tracking-tight">내 등록 제품</h1>
      {justSubmitted ? (
        <p className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-[13px] font-medium text-success">
          접수됐어요! 팀 검수 후 쇼케이스에 공개돼요.
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-3 text-[13px] font-medium text-danger">{actionError}</p>
      ) : null}

      <div className="mt-6">
        {authed === false ? (
          <EmptyState
            title="로그인이 필요해요"
            message="내 등록 제품은 로그인 후 확인할 수 있어요."
            ctaHref="/login"
            ctaLabel="로그인하기"
          />
        ) : items === null ? (
          <p className="py-16 text-center text-[13px] text-muted">불러오는 중…</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="등록한 제품이 없어요"
            message="내 제품을 올려 창문 창업자들에게 알려보세요."
            ctaHref="/showcase/new"
            ctaLabel="내 제품 올리기"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-bg px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-semibold text-ink">{item.name}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-secondary">{item.tagline}</p>
                  {item.status === "REJECTED" && item.rejectReason ? (
                    <p className="mt-1 text-[12.5px] text-danger">반려 사유: {item.rejectReason}</p>
                  ) : null}
                </div>
                <span className="text-[12px] text-muted">
                  {SHOWCASE_CATEGORY_LABELS[item.category]} · 응원 {item.cheers}
                </span>
                <span className="flex items-center gap-2 text-[13px]">
                  {item.status === "APPROVED" ? (
                    <Link href={`/showcase/${item.id}`} className="text-accent underline underline-offset-2">
                      보기
                    </Link>
                  ) : null}
                  <Link href={`/showcase/${item.id}/edit`} className="text-secondary underline underline-offset-2">
                    수정
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="text-danger underline underline-offset-2"
                  >
                    삭제
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ShowcaseMine["status"] }) {
  const tone =
    status === "APPROVED"
      ? "bg-success-soft text-success"
      : status === "REJECTED"
        ? "bg-danger-soft text-danger"
        : "bg-surface text-secondary";
  return (
    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-medium ${tone}`}>
      {SHOWCASE_STATUS_LABELS[status]}
    </span>
  );
}

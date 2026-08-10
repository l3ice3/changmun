"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ShowcaseProductCard } from "@/components/ShowcaseProductCard";
import {
  fetchShowcaseList,
  SHOWCASE_CATEGORY_OPTIONS,
  type ShowcaseList,
} from "@/lib/showcase";

// S6 쇼케이스 — 창업자 제품 홍보의 장. 정부 공고 지면과 분리된 전용 지면(기획안 가드레일 1).
export default function ShowcasePage() {
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ShowcaseList | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    fetchShowcaseList({ category: category || undefined, sort, page })
      .then(setList)
      .catch(() => setFailed(true));
  }, [category, sort, page]);

  return (
    <div className="mx-auto max-w-[1400px] px-3.5 py-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight">쇼케이스</h1>
          <p className="mt-1 text-[13.5px] text-secondary">
            창문에서 자란 창업자들의 제품을 만나보세요. 서로의 첫 사용자가 되어주는 곳이에요.
          </p>
        </div>
        <Link
          href="/showcase/new"
          className="press inline-flex h-10 items-center rounded-full btn-sheen px-5 text-[14px] font-medium text-white"
        >
          내 제품 올리기
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <CategoryChip label="전체" active={category === ""} onPick={() => pick("")} />
        {SHOWCASE_CATEGORY_OPTIONS.map((option) => (
          <CategoryChip
            key={option.value}
            label={option.label}
            active={category === option.value}
            onPick={() => pick(option.value)}
          />
        ))}
        <div className="ml-auto flex items-center gap-1 text-[14px]">
          <SortChip label="최신순" active={sort === "latest"} onPick={() => pickSort("latest")} />
          <SortChip label="응원순" active={sort === "cheers"} onPick={() => pickSort("cheers")} />
        </div>
      </div>

      <div className="mt-6">
        {failed ? (
          <EmptyState
            title="쇼케이스를 불러오지 못했어요"
            message="잠시 후 다시 시도해주세요."
            ctaHref="/showcase"
            ctaLabel="새로고침"
          />
        ) : list === null ? (
          <p className="py-16 text-center text-[13px] text-muted">불러오는 중…</p>
        ) : list.items.length === 0 ? (
          <EmptyState
            title="아직 올라온 제품이 없어요"
            message="첫 번째로 제품을 올려 창문 밖에 진열해 보세요."
            ctaHref="/showcase/new"
            ctaLabel="내 제품 올리기"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {list.items.map((item) => (
                <ShowcaseProductCard key={item.id} item={item} />
              ))}
            </div>
            {list.totalPages > 1 ? (
              <div className="mt-7 flex items-center justify-center gap-2 text-[13px]">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="press rounded-lg border border-line px-3 py-1.5 text-secondary disabled:opacity-40"
                >
                  이전
                </button>
                <span className="tnum text-muted">
                  {list.page} / {list.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= list.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="press rounded-lg border border-line px-3 py-1.5 text-secondary disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );

  function pick(value: string) {
    setCategory(value);
    setPage(1);
  }

  function pickSort(value: string) {
    setSort(value);
    setPage(1);
  }
}

function CategoryChip({
  label,
  active,
  onPick,
}: {
  label: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`press rounded-full px-3.5 py-1.5 text-[13.5px] ${
        active ? "btn-sheen font-medium text-white" : "bg-surface text-secondary"
      }`}
    >
      {label}
    </button>
  );
}

function SortChip({
  label,
  active,
  onPick,
}: {
  label: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`press rounded-full px-3 py-1.5 ${
        active ? "btn-sheen font-medium text-white" : "text-muted hover:text-secondary"
      }`}
    >
      {label}
    </button>
  );
}

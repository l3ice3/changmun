"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { getMe } from "@/lib/auth";
import {
  addShowcaseComment,
  deleteShowcase,
  deleteShowcaseComment,
  fetchShowcaseDetail,
  isNotFound,
  SHOWCASE_CATEGORY_LABELS,
  showcaseImageUrl,
  toggleShowcaseCheer,
  type ShowcaseDetail,
} from "@/lib/showcase";

const ACTION_FAILED_MESSAGE = "요청에 실패했어요. 잠시 후 다시 시도해주세요.";

// S6 쇼케이스 상세 — 승인작만 조회 가능. 404(진짜 없음)와 일시 오류(재시도)를 구분한다(Codex #78 P2).
// 쓰기 실패 시 입력을 지우거나 이동하지 않고 오류를 안내한다(Codex #78 P2).
export default function ShowcaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = Number(params.id);
  const [detail, setDetail] = useState<ShowcaseDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setFailed(false);
    fetchShowcaseDetail(productId)
      .then(setDetail)
      .catch((error) => {
        if (isNotFound(error)) {
          setMissing(true);
          return;
        }
        setFailed(true);
      });
  }, [productId]);

  useEffect(() => {
    reload();
    getMe().then((me) => setAuthed(me.authenticated));
  }, [reload]);

  if (missing) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-14">
        <EmptyState
          title="제품을 찾을 수 없어요"
          message="삭제됐거나 검수 중인 제품이에요."
          ctaHref="/showcase"
          ctaLabel="쇼케이스로 돌아가기"
        />
      </div>
    );
  }
  if (failed) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-14 text-center">
        <p className="text-[15px] font-medium text-ink">제품을 불러오지 못했어요</p>
        <p className="mt-1 text-[13px] text-muted">잠시 후 다시 시도해주세요.</p>
        <button
          type="button"
          onClick={reload}
          className="press mt-5 inline-flex h-10 items-center rounded-full btn-sheen px-6 text-[14px] font-medium text-white"
        >
          다시 시도
        </button>
      </div>
    );
  }
  if (detail === null) {
    return <p className="py-20 text-center text-[13px] text-muted">불러오는 중…</p>;
  }

  async function onCheer() {
    if (!authed) {
      router.push("/login");
      return;
    }
    setActionError(null);
    try {
      const result = await toggleShowcaseCheer(productId);
      if (detail) {
        setDetail({ ...detail, cheers: result.cheers, cheeredByMe: result.cheered });
      }
    } catch {
      setActionError(ACTION_FAILED_MESSAGE);
    }
  }

  async function onComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authed) {
      router.push("/login");
      return;
    }
    if (!comment.trim()) return;
    setBusy(true);
    setActionError(null);
    try {
      await addShowcaseComment(productId, comment.trim());
      setComment("");
      reload();
    } catch {
      // 실패 시 입력을 지우지 않는다 — 작성 내용 보존 + 오류 안내.
      setActionError("댓글 등록에 실패했어요. 내용은 남아 있으니 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteComment(commentId: number) {
    setActionError(null);
    try {
      await deleteShowcaseComment(commentId);
      reload();
    } catch {
      setActionError(ACTION_FAILED_MESSAGE);
    }
  }

  async function onDeleteProduct() {
    if (!window.confirm("제품을 삭제할까요? 응원과 댓글도 함께 삭제돼요.")) return;
    setActionError(null);
    try {
      await deleteShowcase(productId);
      router.push("/showcase");
    } catch {
      setActionError("삭제에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-10">
      <Link href="/showcase" className="text-[13px] text-muted hover:text-secondary">
        ← 쇼케이스
      </Link>

      <div className="mt-5 flex items-start gap-4">
        {detail.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={showcaseImageUrl(detail.id)}
            alt={`${detail.name} 대표 이미지`}
            className="h-16 w-16 shrink-0 rounded-[16px] border border-hair object-cover"
          />
        ) : (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[16px] bg-surface-blue text-[22px] font-bold text-accent">
            {detail.name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">{detail.name}</h1>
          <p className="mt-0.5 text-[14px] text-secondary">{detail.tagline}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="rounded-md bg-violet-soft px-2 py-0.5 font-medium text-violet">
              {SHOWCASE_CATEGORY_LABELS[detail.category]}
            </span>
            <span className="text-muted">{detail.makerName}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onCheer}
          className={`press inline-flex h-11 items-center gap-2 rounded-full px-6 text-[14.5px] font-medium ${
            detail.cheeredByMe ? "btn-sheen text-white" : "bg-surface-blue text-accent"
          }`}
        >
          {detail.cheeredByMe ? "응원 중" : "응원하기"}
          <span className="tnum">{detail.cheers}</span>
        </button>
        {detail.url ? (
          <a
            href={detail.url}
            target="_blank"
            rel="noreferrer noopener"
            className="press inline-flex h-11 items-center rounded-full border border-line px-6 text-[14px] font-medium text-secondary hover:border-edge"
          >
            제품 보러가기 ↗
          </a>
        ) : null}
        {detail.mine ? (
          <span className="ml-auto flex items-center gap-2 text-[13px]">
            <Link href={`/showcase/${detail.id}/edit`} className="text-secondary underline underline-offset-2">
              수정
            </Link>
            <button type="button" onClick={onDeleteProduct} className="text-danger underline underline-offset-2">
              삭제
            </button>
          </span>
        ) : null}
      </div>

      {actionError ? (
        <p className="mt-3 text-[13px] font-medium text-danger">{actionError}</p>
      ) : null}

      <div className="mt-8 whitespace-pre-wrap rounded-[14px] border border-hair bg-bg-alt px-5 py-5 text-[14.5px] leading-relaxed text-secondary">
        {detail.description}
      </div>

      <section className="mt-10">
        <h2 className="text-[16px] font-semibold text-ink">
          댓글 <span className="tnum text-muted">{detail.comments.length}</span>
        </h2>
        <form onSubmit={onComment} className="mt-3 flex gap-2">
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            placeholder={authed ? "제품에 대한 피드백·응원을 남겨보세요" : "로그인하면 댓글을 남길 수 있어요"}
            className="input-base flex-1"
          />
          <button
            type="submit"
            disabled={busy}
            className="press rounded-[10px] btn-sheen px-5 text-[14px] font-medium text-white disabled:opacity-50"
          >
            남기기
          </button>
        </form>
        <ul className="mt-5 flex flex-col gap-4">
          {detail.comments.map((item) => (
            <li key={item.id} className="text-[13.5px]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink">{item.displayName}</span>
                <span className="text-[11.5px] text-dim">
                  {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                </span>
                {item.mine ? (
                  <button
                    type="button"
                    onClick={() => onDeleteComment(item.id)}
                    className="text-[11.5px] text-danger underline underline-offset-2"
                  >
                    삭제
                  </button>
                ) : null}
              </div>
              <p className="mt-1 leading-relaxed text-secondary">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

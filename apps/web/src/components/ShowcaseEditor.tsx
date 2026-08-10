"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getMe } from "@/lib/auth";
import {
  registerShowcase,
  SHOWCASE_CATEGORY_OPTIONS,
  updateShowcase,
  type ShowcaseEditable,
} from "@/lib/showcase";

const MAX_IMAGE_BYTES = 1_048_576;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 쇼케이스 등록/수정 공용 폼 — 로그인 필수, 제출하면 선검수(검수 중) 상태로 접수된다.
export function ShowcaseEditor({ initial }: { initial?: ShowcaseEditable }) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe().then((me) => setAuthed(me.authenticated));
  }, []);

  if (authed === null) {
    return <p className="py-16 text-center text-[13px] text-muted">확인 중…</p>;
  }
  if (!authed) {
    return (
      <div className="py-14 text-center">
        <p className="text-[15px] font-medium text-ink">로그인이 필요해요</p>
        <p className="mt-1 text-[13px] text-muted">제품 등록은 로그인한 창업자만 가능해요.</p>
        <Link
          href="/login"
          className="press mt-5 inline-flex h-10 items-center rounded-full btn-sheen px-6 text-[14px] font-medium text-white"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const image = form.get("image");
    if (image instanceof File && image.size > 0) {
      if (image.size > MAX_IMAGE_BYTES) {
        setError("이미지는 1MB 이하만 업로드할 수 있어요.");
        return;
      }
      if (!IMAGE_TYPES.includes(image.type)) {
        setError("이미지는 JPEG·PNG·WebP만 가능해요.");
        return;
      }
    }
    setBusy(true);
    try {
      if (initial) {
        await updateShowcase(initial.id, form);
      } else {
        await registerShowcase(form);
      }
      router.push("/showcase/mine?submitted=1");
    } catch {
      setError("접수에 실패했어요. 입력 내용을 확인하고 다시 시도해주세요.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex max-w-[640px] flex-col gap-5">
      <Field label="제품 이름" required>
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={initial?.name}
          className="input-base"
          placeholder="예: 창문"
        />
      </Field>
      <Field label="한 줄 소개" required>
        <input
          name="tagline"
          required
          maxLength={120}
          defaultValue={initial?.tagline}
          className="input-base"
          placeholder="내 제품을 한 문장으로"
        />
      </Field>
      <Field label="설명" required>
        <textarea
          name="description"
          required
          maxLength={5000}
          rows={6}
          defaultValue={initial?.description}
          className="input-base resize-y"
          placeholder="무엇을 만드는지, 누구를 위한 것인지 자유롭게 적어주세요"
        />
      </Field>
      <Field label="대표 링크">
        <input
          name="url"
          type="url"
          maxLength={500}
          defaultValue={initial?.url ?? ""}
          className="input-base"
          placeholder="https://"
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="카테고리" required>
          <select
            name="category"
            required
            defaultValue={initial?.category ?? "APP_WEB"}
            className="input-base"
          >
            {SHOWCASE_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="팀명(표시 이름)" required>
          <input
            name="makerName"
            required
            maxLength={60}
            defaultValue={initial?.makerName}
            className="input-base"
            placeholder="예: 팀 ICE"
          />
        </Field>
      </div>
      <Field label={initial ? "대표 이미지 교체(선택)" : "대표 이미지(선택)"}>
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-[13px] text-secondary"
        />
        <p className="mt-1 text-[12px] text-muted">JPEG·PNG·WebP, 1MB 이하</p>
      </Field>

      {error ? <p className="text-[13px] font-medium text-danger">{error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="press inline-flex h-11 items-center rounded-full btn-sheen px-7 text-[14px] font-medium text-white disabled:opacity-50"
        >
          {busy ? "접수 중…" : initial ? "수정하고 재검수 받기" : "등록하고 검수 받기"}
        </button>
        <p className="text-[12px] leading-relaxed text-muted">
          등록하면 팀 검수 후 공개돼요. {initial ? "수정 시 다시 검수를 받아요." : "보통 며칠 안에 반영돼요."}
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </span>
      {children}
    </label>
  );
}

"use client";

import { useEffect, useId, useState } from "react";
import { PROFILE_IMAGE_UPDATED_EVENT, profileImageUrl } from "@/lib/profile";

// 디폴트 프로필 — "프로필"이 읽히는 사람 실루엣 + 브랜드 블루베리 배경.
// (로고 재사용은 프로필 의미가 안 살아서 교체 — QA #24 피드백)
export function DefaultAvatar({ size }: { size: number }) {
  const clipId = useId();
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx="20" cy="20" r="20" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <circle cx="20" cy="20" r="20" fill="#6b78f0" />
        <circle cx="20" cy="16" r="6.4" fill="#ffffff" />
        <path
          d="M20 25.4c-7.2 0-11.8 4.6-12.8 10.2h25.6c-1-5.6-5.6-10.2-12.8-10.2z"
          fill="#ffffff"
        />
      </g>
    </svg>
  );
}

interface Props {
  size?: number;
  /** 업로드/삭제 직후 새로고침 트리거 — 값이 바뀌면 캐시 버스터가 갱신된다. */
  version?: number;
}

// 로그인 사용자 아바타 — 서버 프로필 이미지를 세션 쿠키와 함께 로드, 없으면(404) 디폴트로 폴백.
// 업로드/삭제 성공 시 lib/profile이 쏘는 전역 이벤트를 구독해, 헤더 등 다른 아바타 인스턴스도
// 즉시 재조회한다(Codex #59 — failed 고착·스테일 캐시 방지). 클라이언트 전용.
export function Avatar({ size = 32, version = 0 }: Props) {
  const [failed, setFailed] = useState(false);
  const [bust, setBust] = useState(() => Date.now());

  useEffect(() => {
    setFailed(false);
    setBust(Date.now());
  }, [version]);

  useEffect(() => {
    function refresh() {
      setFailed(false);
      setBust(Date.now());
    }
    window.addEventListener(PROFILE_IMAGE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(PROFILE_IMAGE_UPDATED_EVENT, refresh);
  }, []);

  if (failed) {
    return <DefaultAvatar size={size} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 인증 쿠키(crossOrigin) 필요, next/image 미지원
    <img
      src={profileImageUrl(bust)}
      crossOrigin="use-credentials"
      onError={() => setFailed(true)}
      alt="프로필 이미지"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-full object-cover"
    />
  );
}

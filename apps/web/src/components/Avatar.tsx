"use client";

import { useEffect, useState } from "react";
import { profileImageUrl } from "@/lib/profile";

// 디폴트 프로필 — 브랜드 창문(窓) 모티프: 블루베리 원 + 흰 창살. 업로드 전·삭제 후 기본값.
export function DefaultAvatar({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#6b78f0" />
      <rect
        x="13"
        y="11.5"
        width="14"
        height="17"
        rx="2.4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.9"
      />
      <line x1="20" y1="11.5" x2="20" y2="28.5" stroke="#ffffff" strokeWidth="1.9" />
      <line x1="13" y1="19" x2="27" y2="19" stroke="#ffffff" strokeWidth="1.9" />
    </svg>
  );
}

interface Props {
  size?: number;
  /** 업로드/삭제 직후 새로고침 트리거 — 값이 바뀌면 캐시 버스터가 갱신된다. */
  version?: number;
}

// 로그인 사용자 아바타 — 서버 프로필 이미지를 세션 쿠키와 함께 로드, 없으면(404) 디폴트로 폴백.
// 클라이언트 전용(비로그인·SSR에서는 렌더하지 않음 — AuthMenu가 로그인 확인 후 마운트).
export function Avatar({ size = 32, version = 0 }: Props) {
  const [failed, setFailed] = useState(false);
  // 마운트·버전 변경 시 캐시 버스터 갱신 — 업로드 직후 이전 이미지가 남지 않게.
  const [bust, setBust] = useState(() => Date.now());

  useEffect(() => {
    setFailed(false);
    setBust(Date.now());
  }, [version]);

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

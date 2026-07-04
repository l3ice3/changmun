import type { ReactElement } from "react";

// 소셜 로그인 provider 브랜드 심벌. 배경·글리프는 각 사 브랜드 가이드 공식 컬러 고정 —
// web.md 8의 "항상 고정색이 필요한 곳" 예외(브랜드 로고는 다크 모드에서도 색을 바꾸지 않는다).
type ProviderId = "google" | "github" | "kakao" | "naver";

interface Props {
  id: ProviderId;
  /** sm: 리스트용 24px · md: 아이콘 행용 34px */
  size?: "sm" | "md";
  /** 배지 없이 글리프만 — 밝은 단색 버튼 내부용 */
  plain?: boolean;
}

const BADGE: Record<ProviderId, string> = {
  google: "bg-white border-[0.5px] border-black/10",
  // 다크 배경 위에서도 원이 보이도록 얇은 흰 테두리(항상-어두움 영역 대비 확보).
  github: "bg-[#181717] border-[0.5px] border-white/25",
  kakao: "bg-[#FEE500]",
  naver: "bg-[#03C75A]",
};

const BADGE_SIZE = { sm: "h-6 w-6", md: "h-[34px] w-[34px]" } as const;
const GLYPH_SIZE = { sm: "h-3.5 w-3.5", md: "h-[17px] w-[17px]" } as const;
// 네이버 N은 획이 굵어 한 단계 작게.
const NAVER_SIZE = { sm: "h-3 w-3", md: "h-[15px] w-[15px]" } as const;

const GLYPH: Record<ProviderId, (cls: string) => ReactElement> = {
  google: (cls) => (
    <svg viewBox="0 0 48 48" className={cls}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  ),
  github: (cls) => (
    <svg viewBox="0 0 16 16" className={cls} fill="#ffffff">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  ),
  kakao: (cls) => (
    <svg viewBox="0 0 24 24" className={cls} fill="#191919">
      <path d="M12 3C6.48 3 2 6.48 2 10.77c0 2.77 1.85 5.2 4.63 6.58l-1.18 4.3c-.1.38.33.68.66.46l5.15-3.4c.24.02.49.03.74.03 5.52 0 10-3.48 10-7.97S17.52 3 12 3z" />
    </svg>
  ),
  naver: (cls) => (
    <svg viewBox="0 0 24 24" className={cls} fill="#ffffff">
      <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
    </svg>
  ),
};

export function ProviderIcon({ id, size = "sm", plain = false }: Props) {
  const glyphSize = id === "naver" ? NAVER_SIZE[size] : GLYPH_SIZE[size];
  if (plain) {
    return GLYPH[id](GLYPH_SIZE[size]);
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full ${BADGE_SIZE[size]} ${BADGE[id]}`}
    >
      {GLYPH[id](glyphSize)}
    </span>
  );
}

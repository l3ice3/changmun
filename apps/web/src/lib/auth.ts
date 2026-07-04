// OAuth 로그인 상태·시작·로그아웃. 로그인은 선택 기능 — 실패는 조용히 비로그인으로 폴백(UX 차단 금지).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api/v1";

// OAuth 시작 엔드포인트는 API 호스트 루트(/oauth2/authorization/*)로, /api/v1 밑이 아니다.
const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, "");

export interface Me {
  authenticated: boolean;
  email: string | null;
  provider: string | null;
}

const ANONYMOUS: Me = { authenticated: false, email: null, provider: null };

export const PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "kakao", label: "카카오" },
  { id: "naver", label: "네이버" },
] as const;

export async function fetchMe(): Promise<Me> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return ANONYMOUS;
    return (await res.json()) as Me;
  } catch {
    return ANONYMOUS;
  }
}

// 세션당 /me를 한 번만 조회하도록 캐시(여러 컴포넌트 공유). 로그아웃 시 resetMe로 무효화.
let cachedMe: Promise<Me> | null = null;

export function getMe(): Promise<Me> {
  if (!cachedMe) {
    cachedMe = fetchMe();
  }
  return cachedMe;
}

export function resetMe(): void {
  cachedMe = null;
}

// 브라우저 최상위 이동으로 시작해야 한다(fetch 아님) — provider 리다이렉트 흐름.
export function loginUrl(provider: string): string {
  return `${API_ORIGIN}/oauth2/authorization/${provider}`;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    /* 실패 무시 — 세션은 만료로도 정리된다. */
  }
  resetMe();
}

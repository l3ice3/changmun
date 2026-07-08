// 찜 — 로그인 시 서버 동기화(기기 간), 비로그인은 기기 localStorage(시크릿 모드 폴백 세션 메모리, AC-022).
import { getMe } from "./auth";

const KEY = "changmun_bookmarks";
// api-spec §1: ids 조회 최대 50개. 저장 시 최신 50개로 cap (Codex #18).
const MAX_BOOKMARKS = 50;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api/v1";

let memory: number[] = [];
let cachedIds: Promise<number[]> | null = null;

// ── 익명: localStorage ──────────────────────────────────────────
function storageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = "__changmun_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function localGetIds(): number[] {
  if (!storageAvailable()) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return memory;
  }
}

function localSet(id: number, on: boolean): void {
  const ids = localGetIds();
  const next = on ? [id, ...ids.filter((each) => each !== id)].slice(0, MAX_BOOKMARKS) : ids.filter((each) => each !== id);
  memory = next;
  if (storageAvailable()) {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
}

// ── 로그인: 서버 ────────────────────────────────────────────────
async function serverGetIds(): Promise<number[]> {
  try {
    const res = await fetch(`${API_BASE}/bookmarks`, { credentials: "include", cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { opportunityIds: number[] };
    return data.opportunityIds ?? [];
  } catch {
    return [];
  }
}

async function serverSet(id: number, on: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/bookmarks/${id}`, {
    method: on ? "POST" : "DELETE",
    credentials: "include",
  });
  // fetch는 HTTP 오류(401 세션만료·404 등)에 reject 안 하므로 직접 확인.
  // throw해야 호출부(BookmarkButton)의 낙관적 UI가 롤백된다 — 서버와 어긋남 방지.
  if (!res.ok) {
    throw new Error(`bookmark ${on ? "add" : "remove"} failed: ${res.status}`);
  }
}

// ── 공개 API (로그인 여부에 따라 서버/로컬 선택) ──────────────────
/** 현재 찜한 공고 id — 세션당 한 번만 조회하도록 캐시. 토글 시 무효화. */
export function loadBookmarkIds(): Promise<number[]> {
  if (!cachedIds) {
    cachedIds = resolveIds();
  }
  return cachedIds;
}

async function resolveIds(): Promise<number[]> {
  const me = await getMe();
  return me.authenticated ? serverGetIds() : localGetIds();
}

export function resetBookmarkIds(): void {
  cachedIds = null;
}

// 찜 변경 시 구독 화면(마이페이지 미리보기 등)이 재조회하도록 쏘는 전역 이벤트 (Codex #61).
export const BOOKMARKS_UPDATED_EVENT = "changmun:bookmarks-updated";

function notifyBookmarksUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BOOKMARKS_UPDATED_EVENT));
  }
}

/** 찜 토글 → 새 상태(true=찜됨) 반환. 로그인 시 서버, 아니면 localStorage. */
export async function toggleBookmark(id: number, current: boolean): Promise<boolean> {
  const next = !current;
  const me = await getMe();
  if (me.authenticated) {
    await serverSet(id, next);
  } else {
    localSet(id, next);
  }
  resetBookmarkIds();
  notifyBookmarksUpdated();
  return next;
}

export function usesSessionFallback(): boolean {
  return typeof window !== "undefined" && !storageAvailable();
}

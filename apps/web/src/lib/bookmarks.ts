// 익명 찜 — 기기 localStorage. 시크릿 모드 등 불가 시 세션 메모리로 폴백 (AC-022).

const KEY = "changmun_bookmarks";
// api-spec §1: ids 조회는 최대 50개. 저장 시 최신 50개로 cap 해 계약 한도 초과 요청을 막는다 (Codex #18).
const MAX_BOOKMARKS = 50;
let memory: number[] = [];

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

export function getBookmarks(): number[] {
  if (!storageAvailable()) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return memory;
  }
}

function save(ids: number[]): void {
  memory = ids;
  if (storageAvailable()) {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  }
}

export function isBookmarked(id: number): boolean {
  return getBookmarks().includes(id);
}

// 찜 토글 → 새 상태(true=찜됨) 반환. 최신 찜이 앞에 오도록 prepend.
export function toggleBookmark(id: number): boolean {
  const ids = getBookmarks();
  const exists = ids.includes(id);
  save(exists ? ids.filter((each) => each !== id) : [id, ...ids].slice(0, MAX_BOOKMARKS));
  return !exists;
}

export function usesSessionFallback(): boolean {
  return typeof window !== "undefined" && !storageAvailable();
}

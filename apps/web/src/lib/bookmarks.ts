// 익명 찜 — 기기 localStorage. 시크릿 모드 등 불가 시 세션 메모리로 폴백 (AC-022).

const KEY = "changmun_bookmarks";
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
  save(exists ? ids.filter((each) => each !== id) : [id, ...ids]);
  return !exists;
}

export function usesSessionFallback(): boolean {
  return typeof window !== "undefined" && !storageAvailable();
}

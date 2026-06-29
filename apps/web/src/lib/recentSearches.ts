// 최근 검색어 — 기기 localStorage(시크릿 모드 등 불가 시 세션 메모리 폴백). 개인정보 아님(검색어만).

const KEY = "changmun_recent_searches";
const MAX = 8;
let memory: string[] = [];

function available(): boolean {
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

export function getRecentSearches(): string[] {
  if (!available()) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return memory;
  }
}

function save(list: string[]): void {
  memory = list;
  if (available()) window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function addRecentSearch(term: string): void {
  const trimmed = term.trim();
  if (!trimmed) return;
  save([trimmed, ...getRecentSearches().filter((each) => each !== trimmed)].slice(0, MAX));
}

export function removeRecentSearch(term: string): void {
  save(getRecentSearches().filter((each) => each !== term));
}

export function clearRecentSearches(): void {
  save([]);
}

// api-spec.md §1·§2·§3 응답 타입을 그대로 옮긴다(필드명·enum 일치). 프론트는 서버 계산값을 렌더만 한다.

export type Status = "OPEN" | "CLOSED" | "ALWAYS_OPEN" | "UNDATED";
export type BadgeCode =
  | "NO_BIZ_REQUIRED"
  | "CLOSING_SOON"
  | "ALWAYS_OPEN"
  | "CONDITION_UNKNOWN";

export interface OpportunityCard {
  id: number;
  source: string;
  title: string;
  organization: string | null;
  category: string | null;
  region: string[] | null;
  applicationStartDate: string | null;
  applicationDeadline: string | null;
  isAlwaysOpen: boolean;
  status: Status;
  dDay: number | null;
  closingSoon: boolean;
  badges: BadgeCode[];
  targetStartupStage: string[] | null;
  targetAudienceType: string[] | null;
  eligibilityDetail: string | null;
  supportAmount: string | null;
  maxSupportAmount: number | null;
  detailUrl: string;
}

export interface GlossaryEntry {
  term: string;
  description: string;
}

export interface OtherSource {
  source: string;
  detailUrl: string;
}

export interface OpportunityDetail extends OpportunityCard {
  summary: string | null;
  organizationType: string | null;
  applyUrl: string | null;
  matchedTerms: GlossaryEntry[];
  otherSources: OtherSource[];
}

export interface OpportunityList {
  items: OpportunityCard[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api/v1";

// ISR 재생성 주기 = 수집 주기(일 1회)와 동기 (PRD 오픈이슈 7).
const ONE_DAY_SECONDS = 86_400;

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`API ${status}`);
  }
}

export async function fetchOpportunities(
  query: URLSearchParams,
): Promise<OpportunityList> {
  const res = await fetch(`${API_BASE}/opportunities?${query.toString()}`, {
    next: { revalidate: ONE_DAY_SECONDS },
  });
  if (!res.ok) throw new ApiError(res.status);
  return res.json();
}

export interface Stats {
  open: number;
  newToday: number;
  closingSoon: number;
}

// 홈 지표. 실패 시 null → 히어로가 지표 행을 숨긴다(UX 차단 금지). 항상 최신(no-store).
export async function fetchStats(): Promise<Stats | null> {
  try {
    const res = await fetch(`${API_BASE}/opportunities/stats`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchOpportunity(
  id: string,
): Promise<OpportunityDetail | null> {
  const res = await fetch(`${API_BASE}/opportunities/${id}`, {
    next: { revalidate: ONE_DAY_SECONDS },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status);
  return res.json();
}

export async function fetchGlossary(): Promise<GlossaryEntry[]> {
  const res = await fetch(`${API_BASE}/glossary`, {
    next: { revalidate: ONE_DAY_SECONDS },
  });
  if (!res.ok) throw new ApiError(res.status);
  const data: { items: GlossaryEntry[] } = await res.json();
  return data.items;
}

// 찜 조회(클라이언트) — 저장된 ids로. 빈 배열이면 호출하지 않는다.
// api-spec §1 한도(최대 50)를 방어적으로 다시 cap 한다(저장 단계에서도 cap — bookmarks.ts).
const MAX_IDS = 50;

export async function fetchByIds(ids: number[]): Promise<OpportunityCard[]> {
  const capped = ids.slice(0, MAX_IDS);
  if (capped.length === 0) return [];
  const query = new URLSearchParams({ ids: capped.join(",") });
  const res = await fetch(`${API_BASE}/opportunities?${query.toString()}`);
  if (!res.ok) throw new ApiError(res.status);
  const data: OpportunityList = await res.json();
  return data.items;
}

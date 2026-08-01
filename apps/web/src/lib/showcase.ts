// 쇼케이스 API 클라이언트 — api-spec §6 타입 그대로(camelCase). 쓰기·mine은 세션 쿠키 필요.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api/v1";

export type ShowcaseCategory = "APP_WEB" | "COMMERCE" | "CONTENT" | "LOCAL" | "ETC";
export type ShowcaseStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ShowcaseCard {
  id: number;
  name: string;
  tagline: string;
  category: ShowcaseCategory;
  makerName: string;
  cheers: number;
  hasImage: boolean;
  approvedAt: string;
}

export interface ShowcaseComment {
  id: number;
  displayName: string;
  body: string;
  mine: boolean;
  createdAt: string;
}

export interface ShowcaseDetail {
  id: number;
  name: string;
  tagline: string;
  description: string;
  url: string | null;
  category: ShowcaseCategory;
  makerName: string;
  cheers: number;
  cheeredByMe: boolean;
  mine: boolean;
  hasImage: boolean;
  approvedAt: string;
  comments: ShowcaseComment[];
}

// 소유자 편집용 조회 — 검수 상태 무관, 본인 제품만(GET /showcase/mine/{id}).
export interface ShowcaseEditable {
  id: number;
  name: string;
  tagline: string;
  description: string;
  url: string | null;
  category: ShowcaseCategory;
  makerName: string;
  hasImage: boolean;
  status: ShowcaseStatus;
}

export interface ShowcaseMine {
  id: number;
  name: string;
  tagline: string;
  category: ShowcaseCategory;
  status: ShowcaseStatus;
  rejectReason: string | null;
  cheers: number;
  createdAt: string;
}

export interface ShowcaseList {
  items: ShowcaseCard[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export const SHOWCASE_CATEGORY_LABELS: Record<ShowcaseCategory, string> = {
  APP_WEB: "앱·웹서비스",
  COMMERCE: "커머스",
  CONTENT: "콘텐츠",
  LOCAL: "로컬·오프라인",
  ETC: "기타",
};

export const SHOWCASE_CATEGORY_OPTIONS = (
  Object.entries(SHOWCASE_CATEGORY_LABELS) as [ShowcaseCategory, string][]
).map(([value, label]) => ({ value, label }));

export const SHOWCASE_STATUS_LABELS: Record<ShowcaseStatus, string> = {
  PENDING: "검수 중",
  APPROVED: "공개 중",
  REJECTED: "반려됨",
};

export function showcaseImageUrl(id: number): string {
  return `${API_BASE}/showcase/${id}/image`;
}

// 상태 코드를 보존하는 에러 — 호출부가 404(진짜 없음)와 일시 오류(500·네트워크)를 구분한다(Codex #78 P2).
export class ShowcaseApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`showcase api ${status}`);
    this.status = status;
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ShowcaseApiError && error.status === 404;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ShowcaseApiError(res.status);
  }
  return (await res.json()) as T;
}

export async function fetchShowcaseList(params: {
  category?: string;
  sort?: string;
  page?: number;
}): Promise<ShowcaseList> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.sort) query.set("sort", params.sort);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const res = await fetch(`${API_BASE}/showcase?${query.toString()}`, { cache: "no-store" });
  return parseOrThrow<ShowcaseList>(res);
}

export async function fetchShowcaseWeekly(): Promise<ShowcaseCard[]> {
  const res = await fetch(`${API_BASE}/showcase/weekly`, { next: { revalidate: 600 } });
  const data = await parseOrThrow<{ items: ShowcaseCard[] }>(res);
  return data.items;
}

export async function fetchShowcaseDetail(id: number): Promise<ShowcaseDetail> {
  const res = await fetch(`${API_BASE}/showcase/${id}`, {
    credentials: "include",
    cache: "no-store",
  });
  return parseOrThrow<ShowcaseDetail>(res);
}

export async function fetchShowcaseEditView(id: number): Promise<ShowcaseEditable> {
  const res = await fetch(`${API_BASE}/showcase/mine/${id}`, {
    credentials: "include",
    cache: "no-store",
  });
  return parseOrThrow<ShowcaseEditable>(res);
}

export async function fetchShowcaseMine(): Promise<ShowcaseMine[]> {
  const res = await fetch(`${API_BASE}/showcase/mine`, {
    credentials: "include",
    cache: "no-store",
  });
  const data = await parseOrThrow<{ items: ShowcaseMine[] }>(res);
  return data.items;
}

export async function registerShowcase(form: FormData): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE}/showcase`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  return parseOrThrow<{ id: number }>(res);
}

export async function updateShowcase(id: number, form: FormData): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE}/showcase/${id}`, {
    method: "PUT",
    body: form,
    credentials: "include",
  });
  return parseOrThrow<{ id: number }>(res);
}

export async function deleteShowcase(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/showcase/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new ShowcaseApiError(res.status);
}

export async function toggleShowcaseCheer(
  id: number,
): Promise<{ cheered: boolean; cheers: number }> {
  const res = await fetch(`${API_BASE}/showcase/${id}/cheer`, {
    method: "PUT",
    credentials: "include",
  });
  return parseOrThrow<{ cheered: boolean; cheers: number }>(res);
}

export async function addShowcaseComment(id: number, body: string): Promise<void> {
  const res = await fetch(`${API_BASE}/showcase/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
    credentials: "include",
  });
  if (!res.ok) throw new ShowcaseApiError(res.status);
}

export async function deleteShowcaseComment(commentId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/showcase/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new ShowcaseApiError(res.status);
}

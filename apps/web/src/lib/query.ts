// 서버 페이지의 searchParams → API 쿼리 / 페이지네이션 파라미터 (순수 함수). 화이트리스트 키만 통과.

export type RawParams = Record<string, string | string[] | undefined>;

const PASS_KEYS = ["persona", "region", "category", "status", "q", "sort", "page"] as const;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function toApiQuery(sp: RawParams): URLSearchParams {
  const query = new URLSearchParams();
  for (const key of PASS_KEYS) {
    const value = first(sp[key]);
    if (value) query.set(key, value);
  }
  return query;
}

// 페이지네이션 링크용 — page를 제외한 현재 필터 (page는 Pagination이 채운다).
export function paramsRecord(sp: RawParams): Record<string, string> {
  const record: Record<string, string> = {};
  for (const key of PASS_KEYS) {
    if (key === "page") continue;
    const value = first(sp[key]);
    if (value) record[key] = value;
  }
  return record;
}

export function pageOf(sp: RawParams): number {
  const value = first(sp.page);
  const parsed = value ? Number.parseInt(value, 10) : 1;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 1;
}

export function personaOf(sp: RawParams): string {
  return first(sp.persona) ?? "";
}

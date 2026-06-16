// 행동 로그 — fire-and-forget. 절대 UX를 막지 않는다(await 금지, 에러 무시 — AC-026, web.md 7).
// 허용 payload 키만 보낸다(서버가 화이트리스트 재검증 — api-spec §4).

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api/v1";
const CLIENT_KEY = "changmun_cid";

export type EventType =
  | "list_view"
  | "detail_view"
  | "outbound_click"
  | "bookmark_add"
  | "bookmark_remove"
  | "search";

type Payload = Record<string, string | number>;

function clientId(): string {
  try {
    const stored = window.localStorage.getItem(CLIENT_KEY);
    if (stored) return stored;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(CLIENT_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

export function track(eventType: EventType, payload: Payload = {}): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      clientId: clientId(),
      eventType,
      payload,
      occurredAt: new Date().toISOString(),
    });
    send(body);
  } catch {
    // 로깅 실패는 조용히 무시한다 (AC-026)
  }
}

function send(body: string): void {
  const url = `${API_BASE}/events`;
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

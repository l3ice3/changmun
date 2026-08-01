import type { MetadataRoute } from "next";

// PWA 매니페스트 — 안드로이드 첫 화면(스플래시)·홈 화면 아이콘이 여기 아이콘을 쓴다.
// 매니페스트가 없으면 브라우저가 캐시된 옛 터치 아이콘으로 스플래시를 그림(QA #31 후속).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "창문 — 창업 지원금 큐레이션",
    short_name: "창문",
    description: "흩어진 정부 창업 지원금을 한곳에 모아, 내 창업 단계에 맞는 것만.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4650d8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

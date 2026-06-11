import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "창문 — 창업 지원금 큐레이션",
  description:
    "예비·극초기 창업자와 대학생을 위한, 내 단계에 맞는 정부 지원금만 골라주는 지원금 전담 비서",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

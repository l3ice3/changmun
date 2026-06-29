import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "창문 — 창업 지원금 큐레이션",
    template: "%s · 창문",
  },
  description:
    "예비·극초기 창업자와 대학생을 위한, 내 단계에 맞는 정부 지원금만 골라주는 지원금 전담 비서. 가입 없이 페르소나 탭 한 번으로.",
  openGraph: {
    title: "창문 — 창업 지원금 큐레이션",
    description: "내 단계에 맞는 정부 지원금만, 가입 없이.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          // 페인트 전에 저장된 테마를 적용해 FOUC(밝은→어두운 깜빡임)를 막는다.
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}",
          }}
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@700&display=swap"
        />
      </head>
      <body className="min-h-screen lg:flex">
        <Sidebar />
        <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
          <TopBar />
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

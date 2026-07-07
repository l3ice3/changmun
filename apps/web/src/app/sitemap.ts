import type { MetadataRoute } from "next";
import { fetchOpportunities } from "@/lib/api";

// 상세 페이지 색인용 sitemap (CC-04). 최신 공고 일부 + 정적 라우트. API 실패 시 best-effort.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const entries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/search`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/notices`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${base}/ads`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.2 },
  ];

  try {
    const query = new URLSearchParams({ sort: "latest", size: "50", status: "all" });
    const list = await fetchOpportunities(query);
    for (const item of list.items) {
      entries.push({
        url: `${base}/opportunities/${item.id}`,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  } catch {
    // sitemap은 수집 데이터가 있을 때만 채워진다.
  }

  return entries;
}

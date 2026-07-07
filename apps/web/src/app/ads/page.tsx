import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "광고문의",
  description: "창문 광고·제휴 문의 — 예비·초기 창업자에게 닿는 가장 정확한 접점.",
};

// ⚠️ 임시 이메일 — 실제 광고 문의 메일 계정이 생기면 이 상수만 교체하면 된다.
const ADS_EMAIL = "ads@changmun.com";

const TOPICS = [
  {
    title: "배너·지면 광고",
    body: "홈·공고 탐색 등 서비스 지면에 브랜드를 노출합니다.",
  },
  {
    title: "콘텐츠 제휴",
    body: "창업 지원 프로그램·행사·교육 소식을 창문 이용자에게 소개합니다.",
  },
  {
    title: "기관 협업",
    body: "공공기관·창업 지원 기관의 공고 연동과 데이터 협력을 논의합니다.",
  },
];

export default function AdsPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-14">
      <h1 className="text-[24px] font-semibold tracking-tight">광고문의</h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-secondary">
        창문은 예비·초기 창업자와 대학생 창업팀이 매일 지원금 공고를 확인하러 오는 곳입니다.
        창업 생태계와 맞닿은 브랜드·기관의 광고와 제휴를 기다립니다.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {TOPICS.map((topic) => (
          <div key={topic.title} className="rounded-[14px] border border-line bg-surface px-5 py-5">
            <h2 className="text-[14.5px] font-semibold text-ink">{topic.title}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">{topic.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-[14px] bg-surface-blue px-6 py-6">
        <h2 className="text-[15px] font-semibold text-ink">문의 방법</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-secondary">
          아래 내용을 담아 메일로 보내주세요. 영업일 기준 3일 안에 회신드리도록 노력하겠습니다.
        </p>
        <ul className="mt-3 space-y-1.5 text-[13.5px] leading-relaxed text-secondary [&_li]:ml-5 [&_li]:list-disc">
          <li>회사(기관)명과 담당자 연락처</li>
          <li>제안 내용(광고 지면·제휴 형태 등)</li>
          <li>희망 일정</li>
        </ul>
        <a
          href={`mailto:${ADS_EMAIL}?subject=[광고문의]`}
          className="press mt-5 inline-flex h-11 items-center rounded-full bg-accent px-6 text-[14px] font-medium text-white hover:bg-accent-hover"
        >
          {ADS_EMAIL}
        </a>
      </div>

      <p className="mt-6 text-[12px] leading-relaxed text-muted">
        ※ 공고 정보 자체는 광고와 무관하게 공공 API 수집 기준으로만 노출됩니다. 광고·제휴가 공고
        노출 순서에 영향을 주지 않습니다.
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { COMPANY } from "@/lib/links";

export const metadata: Metadata = {
  title: "이용약관",
  description: "창문 서비스 이용약관 — 무료 정보 서비스의 성격, 이용자의 권리와 의무.",
};

// 실제 서비스 성격과 1:1 대응하는 초안 — 공고 정보는 참고용(원문 우선), 로그인은 선택,
// 신청·심사·선정은 각 주관기관 소관(카피 가드레일과 동일 원칙). 시행일은 팀 확정 후 교체.
const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "제1조 (목적)",
    body: (
      <p>
        이 약관은 창문(이하 &ldquo;서비스&rdquo;)의 이용과 관련하여 서비스와 이용자 간의 권리·의무
        및 책임 사항을 정하는 것을 목적으로 합니다.
      </p>
    ),
  },
  {
    title: "제2조 (서비스의 성격)",
    body: (
      <>
        <p>
          서비스는 공공기관이 공개한 창업 지원사업 공고를 공식 API로 수집해 한곳에 모아 보여주는{" "}
          <strong className="text-ink">무료 정보 서비스</strong>입니다.
        </p>
        <ul>
          <li>서비스는 지원사업의 주관기관이 아니며, 신청 접수·심사·선정에 관여하지 않습니다.</li>
          <li>지원사업의 신청 자격 판단과 합격 여부는 각 공고의 원문과 주관기관 안내를 따릅니다.</li>
        </ul>
      </>
    ),
  },
  {
    title: "제3조 (정보의 정확성)",
    body: (
      <>
        <p>
          서비스는 수집한 공고 정보를 정확하게 제공하기 위해 노력하지만, 공고 내용(마감일·자격
          요건 등)은 주관기관 사정으로 변경될 수 있습니다.
        </p>
        <ul>
          <li>공고 정보는 참고용이며, 신청 전 반드시 원문 링크의 최신 내용을 확인해야 합니다.</li>
          <li>서비스가 표시하는 D-day·상태 등은 조회 시점 기준으로 서버가 계산한 값입니다.</li>
        </ul>
      </>
    ),
  },
  {
    title: "제4조 (계정과 로그인)",
    body: (
      <ul>
        <li>서비스는 로그인 없이 모든 기능을 사용할 수 있으며, 로그인은 찜한 공고의 기기 간 동기화를 위한 선택 기능입니다.</li>
        <li>로그인은 소셜 계정(Google·GitHub·카카오·네이버)으로 하며, 소셜 계정의 관리 책임은 이용자에게 있습니다.</li>
        <li>이용자는 언제든지 계정 삭제를 요청할 수 있습니다(개인정보처리방침 참조).</li>
      </ul>
    ),
  },
  {
    title: "제5조 (이용자의 의무)",
    body: (
      <ul>
        <li>서비스의 정상 운영을 방해하는 행위(과도한 자동화 접근, 취약점 악용 등)를 하지 않습니다.</li>
        <li>서비스가 제공하는 정보를 무단으로 대량 복제·재배포하지 않습니다.</li>
        <li>타인의 계정을 도용하지 않습니다.</li>
      </ul>
    ),
  },
  {
    title: "제6조 (지식재산)",
    body: (
      <p>
        서비스의 화면 구성·디자인·소프트웨어에 대한 권리는 서비스에 있습니다. 공고 원문의 저작권은
        각 주관기관에 있으며, 서비스는 출처를 표시하고 원문 링크를 제공합니다.
      </p>
    ),
  },
  {
    title: "제7조 (서비스의 변경·중단)",
    body: (
      <p>
        서비스는 현재 베타 단계로, 기능이 추가·변경될 수 있습니다. 서비스를 중대한 범위로 변경하거나
        중단하는 경우 공지사항으로 사전에 알리도록 노력합니다.
      </p>
    ),
  },
  {
    title: "제8조 (책임의 한계)",
    body: (
      <>
        <p>
          서비스는 무료로 제공되는 정보 서비스로서, 다음에 대해서는 고의 또는 중대한 과실이 없는 한
          책임을 지지 않습니다.
        </p>
        <ul>
          <li>공고 정보의 오류·누락·지연으로 인해 발생한 손해</li>
          <li>지원사업 신청 결과(선정·탈락 등)</li>
          <li>천재지변, 외부 API 장애 등 서비스가 통제할 수 없는 사유로 인한 서비스 중단</li>
        </ul>
      </>
    ),
  },
  {
    title: "제9조 (약관의 변경)",
    body: (
      <p>
        약관을 변경하는 경우 시행 7일 전부터 공지사항으로 알립니다. 변경된 약관 시행 이후 서비스를
        계속 이용하면 변경에 동의한 것으로 봅니다.
      </p>
    ),
  },
  {
    title: "제10조 (준거법과 문의처)",
    body: (
      <p>
        이 약관은 대한민국 법률에 따라 해석됩니다. 약관에 대한 문의: {COMPANY.email}
        <br />
        <span className="text-muted">
          ※ 법인 설립·정식 시행 전 임시 안내입니다. 시행일은 서비스 정식 오픈일(확정 시 명시)입니다.
        </span>
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-12">
      <h1 className="text-[26px] font-semibold tracking-tight">이용약관</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-secondary">
        창문은 흩어진 창업 지원금 공고를 한곳에 모아 보여주는 무료 정보 서비스입니다. 서비스를
        이용하면 아래 약관에 동의한 것으로 봅니다.
      </p>

      <div className="mt-10 space-y-9">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">{section.title}</h2>
            <div className="mt-2.5 space-y-2.5 text-[14px] leading-relaxed text-secondary [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

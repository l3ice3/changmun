import type { Metadata } from "next";
import { COMPANY } from "@/lib/links";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "창문 개인정보처리방침 — 로그인 시 이메일·소셜 계정 식별자만 최소 수집하며, 비로그인 이용 기록은 익명으로 처리합니다.",
};

// 실제 구현과 1:1 대응하는 초안 — 수집 항목·목적·저장 위치가 코드/스키마(data-model §8,
// event_log 화이트리스트)와 어긋나면 이 문서를 함께 갱신한다. 책임자·시행일은 팀 확정 후 교체.
const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. 총칙",
    body: (
      <>
        <p>
          창문(이하 &ldquo;서비스&rdquo;)은 개인정보를 <strong>필요한 최소한으로만</strong> 수집합니다.
          로그인 없이도 모든 기능을 사용할 수 있으며, 로그인은 찜한 공고를 기기 간에 동기화하기 위한
          선택 기능입니다.
        </p>
      </>
    ),
  },
  {
    title: "2. 수집하는 개인정보 항목과 방법",
    body: (
      <>
        <p className="font-medium text-ink">소셜 로그인 시 (선택)</p>
        <ul>
          <li>이메일 주소</li>
          <li>소셜 로그인 제공자 종류(Google·GitHub·카카오·네이버)와 해당 제공자의 계정 식별자</li>
        </ul>
        <p>
          위 두 가지만 저장하며, <strong>소셜 계정의 비밀번호·프로필·친구 목록·액세스 토큰은 저장하지
          않습니다.</strong>
        </p>
        <p className="font-medium text-ink">서비스 이용 과정에서 자동 수집 (비로그인 포함)</p>
        <ul>
          <li>
            익명 이용 기록: 무작위로 생성된 익명 ID 기준의 조회·검색·찜 행동 기록. 이름·이메일 등
            개인을 식별할 수 있는 정보는 포함되지 않으며, 허용된 항목 외에는 서버가 저장하지 않습니다.
          </li>
          <li>브라우저 저장소(localStorage): 비로그인 찜 목록, 화면 테마, 최근 검색어 — 이용자의 기기에만 저장되고 서버로 전송되지 않습니다.</li>
          <li>세션 쿠키: 로그인 상태 유지용(HttpOnly). 로그아웃 또는 만료 시 소멸합니다.</li>
        </ul>
      </>
    ),
  },
  {
    title: "3. 이용 목적",
    body: (
      <ul>
        <li>소셜 로그인 인증과 로그인 상태 유지</li>
        <li>찜한 공고의 기기 간 동기화</li>
        <li>익명 통계에 기반한 서비스 개선(어떤 공고·검색어가 많이 이용되는지)</li>
      </ul>
    ),
  },
  {
    title: "4. 보유 기간과 파기",
    body: (
      <>
        <p>
          개인정보는 이용 목적이 달성되면 지체 없이 파기합니다. 이용자가 삭제를 요청하면 계정
          정보(이메일·계정 식별자)와 서버에 저장된 찜 목록을 지체 없이 삭제합니다. 관계 법령이 보존을
          요구하는 경우 해당 기간 동안만 분리 보관 후 파기합니다.
        </p>
      </>
    ),
  },
  {
    title: "5. 제3자 제공",
    body: <p>개인정보를 제3자에게 제공하지 않습니다.</p>,
  },
  {
    title: "6. 처리 위탁",
    body: (
      <p>
        서비스 운영을 위해 클라우드 인프라(호스팅)에 데이터가 보관될 수 있습니다. 위탁 업체와 위탁
        범위는 서비스 정식 배포 시점에 본 방침에 명시합니다.
      </p>
    ),
  },
  {
    title: "7. 이용자의 권리",
    body: (
      <p>
        이용자는 언제든지 본인의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있습니다. 아래
        연락처로 요청하면 지체 없이 처리합니다.
      </p>
    ),
  },
  {
    title: "8. 안전성 확보 조치",
    body: (
      <ul>
        <li>최소 수집 원칙 — 이메일과 계정 식별자 외에는 저장하지 않음</li>
        <li>소셜 로그인 토큰 비저장, 세션 쿠키 HttpOnly 적용</li>
        <li>이용 기록의 익명화(익명 ID)와 저장 항목 화이트리스트 검증</li>
      </ul>
    ),
  },
  {
    title: "9. 개인정보 보호책임자와 문의처",
    body: (
      <p>
        개인정보 보호책임자: {COMPANY.rep} · 문의: {COMPANY.email}
        <br />
        <span className="text-muted">
          ※ 법인 설립·정식 시행 전 임시 안내입니다. 확정 시 책임자 성명과 연락처가 갱신됩니다.
        </span>
      </p>
    ),
  },
  {
    title: "10. 고지 의무",
    body: (
      <p>
        본 방침의 내용이 변경되는 경우 시행 7일 전부터 서비스 내 공지로 알립니다. 시행일: 서비스 정식
        오픈일(확정 시 명시).
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-12">
      <h1 className="text-[26px] font-semibold tracking-tight">개인정보처리방침</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-secondary">
        창문은 &ldquo;필요한 것만, 익명이 기본&rdquo;을 원칙으로 개인정보를 처리합니다. 로그인하지
        않으면 개인을 식별할 수 있는 정보를 수집하지 않습니다.
      </p>

      <div className="mt-10 space-y-9">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">{section.title}</h2>
            <div className="privacy-body mt-2.5 space-y-2.5 text-[14px] leading-relaxed text-secondary [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// 푸터 링크 + 회사 정보. 외부(노션 등)는 절대 URL, 내부 페이지는 "/"로 시작하는 경로.
// 빈 값이면 "준비 중" 비활성 렌더.
export interface SiteLink {
  label: string;
  /** 절대 URL(외부, 새 탭) 또는 "/" 시작 내부 경로. 빈 문자열이면 미연결 상태로 표시(클릭 불가). */
  url: string;
}

// 나중에 노션 주소가 생기면 각 url에 붙여넣기만 하면 된다.
export const FOOTER_LINKS: SiteLink[] = [
  { label: "서비스 소개", url: "/about" },
  { label: "공지사항", url: "/notices" },
  { label: "광고문의", url: "/ads" },
  { label: "이용약관", url: "/terms" },
  { label: "개인정보처리방침", url: "/privacy" },
];

// 회사 정보 — 아직 법인 설립 전이라 임시(가칭). 정식 등록되면 교체.
export const COMPANY = {
  legalName: "주식회사 창문",
  status: "법인 설립 준비 중 🪟",
  rep: "창문지기",
  email: "hello@changmun.app",
  address: "서울 어딘가, 햇살 잘 드는 창가 자리",
  bizNo: "000-00-00000 (발급 예정)",
};

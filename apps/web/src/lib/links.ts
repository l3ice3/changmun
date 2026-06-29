// 푸터 외부 링크 + 회사 정보. 노션 페이지가 생기면 url만 채우면 연결됨(빈 값이면 "준비 중" 비활성 렌더).
export interface SiteLink {
  label: string;
  /** 노션 등 외부 URL. 빈 문자열이면 미연결 상태로 표시(클릭 불가). */
  url: string;
}

// 나중에 노션 주소가 생기면 각 url에 붙여넣기만 하면 된다.
export const FOOTER_LINKS: SiteLink[] = [
  { label: "서비스 소개", url: "" },
  { label: "공지사항", url: "" },
  { label: "문의하기", url: "" },
  { label: "이용약관", url: "" },
  { label: "개인정보처리방침", url: "" },
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

// 공지사항 — 관리자 UI 없이(절대규칙 10) 레포 파일로 관리한다.
// 공지 추가 방법: 아래 배열 "맨 앞"에 항목을 추가하고 커밋 → 배포되면 /notices에 노출.
// date는 YYYY-MM-DD, body는 문단 배열. 카피 가드레일(합격 보장 표현 금지) 준수.

export interface Notice {
  /** 앵커용 고유 슬러그 (영문-kebab) */
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** 문단 배열 */
  body: string[];
}

export const NOTICES: Notice[] = [
  {
    slug: "beta-open",
    title: "창문 베타 서비스를 시작합니다 🪟",
    date: "2026-07-07",
    body: [
      "흩어진 창업 지원금을 한곳에 모아 보여주는 창문이 베타 서비스를 시작했습니다.",
      "지금 K-Startup·온통청년의 공고를 모아 보여드리고 있으며, 기업마당 공고도 곧 추가될 예정입니다. 회원가입 없이 모든 기능을 사용할 수 있고, 로그인하면 찜한 공고가 기기 간에 동기화됩니다.",
      "이용 중 불편한 점이나 아이디어가 있다면 푸터의 문의 메일로 편하게 알려주세요. 하나씩 빠르게 반영하겠습니다.",
    ],
  },
];

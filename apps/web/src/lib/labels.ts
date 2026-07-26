// 코드 → 한글 라벨 매핑(한 곳에서만). 서버는 코드를, 프론트는 라벨을 렌더한다 (web.md 규칙 2).
import type { BadgeCode, OpportunityCard } from "./api";

export const BADGE_LABELS: Record<BadgeCode, string> = {
  NO_BIZ_REQUIRED: "사업자 불필요",
  CLOSING_SOON: "마감임박",
  ALWAYS_OPEN: "상시모집",
  CONDITION_UNKNOWN: "조건 미상",
};

// 배지 톤: 신규/대표성=블루베리, 임박=coral, 상시=mint, 미상=중립.
export const BADGE_TONE: Record<BadgeCode, "blue" | "danger" | "success" | "muted"> = {
  NO_BIZ_REQUIRED: "blue",
  CLOSING_SOON: "danger",
  ALWAYS_OPEN: "success",
  CONDITION_UNKNOWN: "muted",
};

export const PERSONA_TABS = [
  { key: "", label: "전체" },
  { key: "PRE_STARTUP", label: "예비창업자" },
  { key: "UNIV_STUDENT", label: "대학생" },
  { key: "EARLY_STAGE", label: "초기창업자" },
] as const;

// 16개 시도 — 2026 행정구역 통합(광주+전남=전남광주), data-model §7·api-spec §1 region
export const REGIONS = [
  "전국", "서울", "부산", "대구", "인천", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남광주", "경북", "경남", "제주", "해외",
];

export const CATEGORIES = [
  "사업화", "기술개발(R&D)", "시설ㆍ공간ㆍ보육", "멘토링ㆍ컨설팅ㆍ교육", "글로벌",
  "인력", "융자ㆍ보증", "행사ㆍ네트워크", "창업교육", "판로ㆍ해외진출", "정책자금", "기타",
];

export const STAGE_LABELS: Record<string, string> = {
  PRE_STARTUP: "예비창업자",
  LT_1Y: "1년 미만",
  LT_2Y: "2년 미만",
  LT_3Y: "3년 미만",
  LT_5Y: "5년 미만",
  LT_7Y: "7년 미만",
  LT_10Y: "10년 미만",
};

export const AUDIENCE_LABELS: Record<string, string> = {
  YOUTH: "청년",
  UNIV_STUDENT: "대학생",
  GENERAL: "일반인",
  UNIVERSITY: "대학",
  RESEARCH_INST: "연구기관",
  COMPANY: "기업",
  SOLO_CREATOR: "1인 창조기업",
};

// "누가 되는지" 읽을 수 있는 라벨 목록(업력 + 대상). 신호 없으면 빈 배열.
export function targetLabels(
  stages: string[] | null,
  audiences: string[] | null,
): string[] {
  const result: string[] = [];
  for (const code of stages ?? []) result.push(STAGE_LABELS[code] ?? code);
  for (const code of audiences ?? []) result.push(AUDIENCE_LABELS[code] ?? code);
  return result;
}

export const SOURCE_LABELS: Record<string, string> = {
  "k-startup": "K-Startup",
  bizinfo: "기업마당",
  "ontong-youth": "온통청년",
};

// 홈 맞춤 둘러보기 기본 페르소나 — 서버(프리페치)·클라(칩 초기값)가 공유.
// "use client" 모듈의 상수는 서버 컴포넌트에서 값으로 못 쓰므로 여기(lib)에 둔다.
export const DEFAULT_BROWSE_PERSONA = "PRE_STARTUP";

// 지원 대상 필터 옵션 — "전체"는 각 UI의 allLabel/기본값이 담당하므로 키 있는 항목만.
export const PERSONA_OPTIONS = PERSONA_TABS.filter((tab) => tab.key).map((tab) => ({
  value: tab.key,
  label: tab.label,
}));

// 출처 필터 옵션 — API 값(key)과 표시 라벨이 달라 쌍으로 제공.
export const SOURCE_OPTIONS = Object.entries(SOURCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// 지원금 필터 옵션 — "has"=유무(hasAmount=true), 숫자=하한(minAmount, 원 단위). FR-009·screens.md.
export const AMOUNT_OPTIONS = [
  { value: "has", label: "지원금 확인 공고" },
  { value: "10000000", label: "1천만원 이상" },
  { value: "50000000", label: "5천만원 이상" },
  { value: "100000000", label: "1억원 이상" },
];

// 최대 지원액(원) → "최대 X원" 사실 서술 라벨. 반올림으로 실제보다 크게 보이지 않게 내림만 쓴다(FR-008 가드레일).
export function amountLabel(maxSupportAmount: number): string {
  const EOK = 100_000_000;
  const MAN = 10_000;
  if (maxSupportAmount >= EOK) {
    const eok = Math.floor((maxSupportAmount / EOK) * 10) / 10;
    return `최대 ${eok}억원`;
  }
  if (maxSupportAmount >= MAN) {
    return `최대 ${Math.floor(maxSupportAmount / MAN).toLocaleString()}만원`;
  }
  return `최대 ${maxSupportAmount.toLocaleString()}원`;
}

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

// D-day 라벨은 서버 status/dDay만 사용한다 — 프론트에서 날짜 연산 금지 (AC-013).
export function dDayLabel(item: Pick<OpportunityCard, "status" | "dDay">): string {
  if (item.status === "ALWAYS_OPEN") return "상시모집";
  if (item.status === "UNDATED") return "기간 미상";
  if (item.status === "CLOSED") return "마감";
  if (item.dDay === 0) return "D-DAY";
  return `D-${item.dDay}`;
}

// D-day 색: mint(여유) → coral(임박), 상시/미상은 중립.
export function dDayTone(
  item: Pick<OpportunityCard, "status" | "closingSoon">,
): "success" | "danger" | "muted" {
  if (item.status === "CLOSED") return "muted";
  if (item.status === "ALWAYS_OPEN" || item.status === "UNDATED") return "muted";
  if (item.closingSoon) return "danger";
  return "success";
}

export function periodLabel(start: string | null, end: string | null): string {
  if (!start && !end) return "기간 미상";
  if (!end) return `${start} ~`;
  if (!start) return `~ ${end}`;
  return `${start} ~ ${end}`;
}

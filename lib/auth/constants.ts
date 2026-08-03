export const TEAMS = [
  "생산팀",
  "회계팀",
  "환경안전팀",
  "영업채산팀",
  "섬들채",
  "증도지원팀",
  "전략기획실",
  "염전관리팀",
] as const;

export type Team = (typeof TEAMS)[number];

// 관리자 계정은 조직표상 팀 소속이 없다. 로그인 화면의 소속팀 선택에만 노출하고
// (회원가입 폼의 TEAMS에는 포함하지 않음 — 일반 가입자가 선택할 수 없도록),
// 이름+소속팀 조합으로 계정을 찾는 로그인 조회 로직이 관리자도 찾을 수 있게 한다.
export const ADMIN_TEAM = "관리자" as const;
export const LOGIN_TEAMS = [...TEAMS, ADMIN_TEAM] as const;

export const SIGNUP_ROLES = [
  { value: "member", label: "팀원" },
  { value: "leader", label: "팀장" },
  { value: "ceo", label: "대표" },
] as const;

export type SignupRole = (typeof SIGNUP_ROLES)[number]["value"];

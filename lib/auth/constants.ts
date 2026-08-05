export const TEAMS = [
  "생산팀",
  "회계팀",
  "환경안전팀",
  "영업팀",
  "영업채산팀",
  "섬들채",
  "증도지원팀",
  "전략기획실",
  "염전관리팀",
] as const;

export type Team = (typeof TEAMS)[number];

export const SIGNUP_ROLES = [
  { value: "member", label: "팀원" },
  { value: "leader", label: "팀장" },
  { value: "ceo", label: "대표" },
] as const;

export type SignupRole = (typeof SIGNUP_ROLES)[number]["value"];

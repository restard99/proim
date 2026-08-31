// 임원실 대시보드 전용 법인 상수 (박물관/전시장 포함 4개 법인).
// 기존 YERP_CORPS(corps.ts, 3개 법인)는 출금조회/수금현황 등 실행부서 화면에서 쓰므로
// 그대로 두고, 임원실 화면에서만 박물관을 추가로 보여주기 위해 별도 파일로 둔다.
// "server-only" 의존성이 없어 클라이언트 컴포넌트에서 바로 import할 수 있다.
export const EXECUTIVE_CORPS = [
  { corpCode: "0460", corpName: "태평소금" },
  { corpCode: "0400", corpName: "태평염전" },
  { corpCode: "0360", corpName: "섬들채" },
  { corpCode: "0440", corpName: "박물관" },
] as const;

export type ExecutiveCorpCode = (typeof EXECUTIVE_CORPS)[number]["corpCode"];

// 손익자료 탭은 박물관을 제외한 3개 법인만 다룬다 (03-decisions.md 참고).
export const EXECUTIVE_PL_CORPS = EXECUTIVE_CORPS.filter((c) => c.corpCode !== "0440");

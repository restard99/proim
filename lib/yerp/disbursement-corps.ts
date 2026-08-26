// 관리 대상 3개 법인 (Y-ERP는 한 DB에서 여러 법인을 CORP_CODE로 구분해 관리하는 멀티코퍼레이션 구조).
// "server-only"/mssql 의존성이 없는 별도 파일 — 클라이언트 컴포넌트(DisbursementsView)에서
// 값을 직접 import해야 해서, server-only인 disbursements.ts에 두면 클라이언트 번들에
// mssql까지 끌려 들어가 빌드 에러가 난다.
export const DISBURSEMENT_CORPS = [
  { corpCode: "0460", corpName: "태평소금" },
  { corpCode: "0400", corpName: "태평염전" },
  { corpCode: "0360", corpName: "섬들채" },
] as const;
export type DisbursementCorpCode = (typeof DISBURSEMENT_CORPS)[number]["corpCode"];

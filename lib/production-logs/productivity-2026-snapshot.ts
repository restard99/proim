// 임시 스냅샷: `F:\개발\ERP\주간_월간_업무보고_2026.08.09.xlsx`의 "인당생산성" 시트,
// 26년 블록(월별 표, C20:Q35)을 한 번 그대로 옮겨온 정적 데이터다.
// 이 파일을 업로드/파싱하는 기능이 아니라 수동으로 옮긴 값이라 자동 갱신되지 않는다.
// 사용자 피드백: "일단 26년 데이터만 임시로 자리를 잡아줘" — 화면 구조는 나중에 다시 설계 예정.
export type Productivity2026Row = {
  month: string;
  cheonilYeom: number | null;
  gagongYeom: number | null;
  total: number | null;
  workers: number | null;
  workDays: number | null;
  regularHours: number | null;
  perMonth: number | null;
  perDay: number | null;
};

export const PRODUCTIVITY_2026_SNAPSHOT: Productivity2026Row[] = [
  { month: "1월", cheonilYeom: 156730, gagongYeom: 55985, total: 212715, workers: 22, workDays: 21, regularHours: 3696, perMonth: 9668.86, perDay: 460.42 },
  { month: "2월", cheonilYeom: 55507, gagongYeom: 37130, total: 92637, workers: 21, workDays: 15, regularHours: 2520, perMonth: 4411.29, perDay: 294.09 },
  { month: "3월", cheonilYeom: 123222, gagongYeom: 57990, total: 181212, workers: 20, workDays: 21, regularHours: 3360, perMonth: 9060.6, perDay: 431.46 },
  { month: "4월", cheonilYeom: 142635, gagongYeom: 59746, total: 202381, workers: 20, workDays: 22, regularHours: 3520, perMonth: 10119.05, perDay: 459.96 },
  { month: "5월", cheonilYeom: 136036, gagongYeom: 49313, total: 185349, workers: 20, workDays: 20, regularHours: 3200, perMonth: 9267.45, perDay: 463.37 },
  { month: "6월", cheonilYeom: 218223, gagongYeom: 64676, total: 282899, workers: 19, workDays: 20, regularHours: 3040, perMonth: 14889.42, perDay: 744.47 },
  { month: "7월", cheonilYeom: null, gagongYeom: null, total: null, workers: null, workDays: null, regularHours: null, perMonth: null, perDay: null },
  { month: "8월", cheonilYeom: null, gagongYeom: null, total: null, workers: null, workDays: null, regularHours: null, perMonth: null, perDay: null },
  { month: "9월", cheonilYeom: null, gagongYeom: null, total: null, workers: null, workDays: null, regularHours: null, perMonth: null, perDay: null },
  { month: "10월", cheonilYeom: null, gagongYeom: null, total: null, workers: null, workDays: null, regularHours: null, perMonth: null, perDay: null },
  { month: "11월", cheonilYeom: null, gagongYeom: null, total: null, workers: null, workDays: null, regularHours: null, perMonth: null, perDay: null },
  { month: "12월", cheonilYeom: null, gagongYeom: null, total: null, workers: null, workDays: null, regularHours: null, perMonth: null, perDay: null },
  { month: "계", cheonilYeom: 832353, gagongYeom: 324840, total: 1157193, workers: 122, workDays: 119, regularHours: 19336, perMonth: 9485.19, perDay: 2853.77 },
  { month: "평균", cheonilYeom: 138725.5, gagongYeom: 54140, total: 192865.5, workers: 20.33, workDays: 19.83, regularHours: 3222.67, perMonth: 4784.72, perDay: 241.25 },
];

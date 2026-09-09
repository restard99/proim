import "server-only";
import ExcelJS from "exceljs";

// "주간_월간_업무보고" 워크북의 "생산-염전" 시트를 그대로 옮긴다(PPT 주간업무보고 "■ 태평염전
// 생산실적" + "■ 공구별 생산 실적" 페이지). 이 시트는 두 부분으로 나뉜다:
//  1) 4~6행(52~70열): "지금 이 순간" 기준 공구별(1공구/3공구) 주간·월간·연간 실적 스냅샷 —
//     매번 워크북을 다시 만들 때 최신 상태로 덮어써지는 표라, 과거 특정 주로 거슬러 올라가는
//     값이 아니라 항상 "최근 업로드 시점 기준" 값이다.
//  2) 16행부터: 일자별 한 행 + 그 행 안에 주간/월간/연간 계획·실적 블록(52~66열)이 있는 성긴
//     표(보고서를 실제로 만든 날에만 값이 참, 나머지는 빈칸) — 이번 해 월별 실적(월간실적,
//     BG열)은 이 표를 날짜 순으로 훑으면서 그 달의 마지막 값으로 얻는다(월 안에서 여러 번
//     반복 기록되므로 마지막 값이 그 달의 확정치).
// 전년동월 실적/누계는 73~90열에 매번 최신 기준으로 이미 계산되어 고정 배치돼 있어 그대로
// 읽는다. 이번 해 연누계는 그런 고정 칸이 없어서, 월별 실적을 3월부터 순서대로 누적 합산해
// 직접 만든다(실측 결과 원본 PPT 수치와 정확히 일치 확인).
//
// 계획(플랜)과 별개로 파서 자체는 계획/생산-소금 파서(parse-report-workbook-targets.ts)와
// 독립된 파일이다 — 태평염전 생산 페이지 하나만을 위한 스냅샷이라 재사용 범위가 다르다.

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const obj = v as { richText?: { text: string }[]; result?: unknown };
    if (obj.richText) return obj.richText.map((t) => t.text).join("").trim();
    if (typeof obj.result === "string") return obj.result.trim();
    if (typeof obj.result === "number") return String(obj.result);
    return "";
  }
  return String(v).trim();
}

function cellNum(cell: ExcelJS.Cell): number | null {
  const v = cell.value;
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const r = (v as { result?: unknown }).result;
    if (typeof r === "number") return r;
    return null;
  }
  return null;
}

function colNum(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

// 헤더 행에서 "n월" 라벨을 찾아 그 열의 값을 월 번호 키로 모은다("총"/"합계" 같은 라벨은
// 건너뜀) — 3~10월처럼 고정폭으로 매달 다 있는 표에 쓴다(성긴 표 아님).
function readMonthlyByLabel(
  ws: ExcelJS.Worksheet,
  headerRow: number,
  valueRow: number,
  startCol: number,
  endCol: number,
): Map<number, number> {
  const out = new Map<number, number>();
  const header = ws.getRow(headerRow);
  const value = ws.getRow(valueRow);
  for (let c = startCol; c <= endCol; c++) {
    const label = cellText(header.getCell(c));
    const m = label.match(/^(\d{1,2})월$/);
    if (!m) continue;
    const v = cellNum(value.getCell(c));
    if (v === null) continue;
    out.set(Number(m[1]), v);
  }
  return out;
}

// dateCol에 값이 있는 모든 행에서 actualCol의 값을 훑어, 그 날짜가 속한 달의 마지막(가장
// 늦은 날짜) 값을 그 달의 확정 실적으로 삼는다(월간실적은 그 달 안에서 매주 갱신되며 반복
// 기록되므로, 날짜 순으로 훑으며 덮어쓰면 자연히 마지막 값이 남는다).
function scanMonthlyActual(ws: ExcelJS.Worksheet, dateCol: number, actualCol: number): Map<number, number> {
  const byMonthKey = new Map<string, number>();
  for (let r = 1; r <= ws.rowCount; r++) {
    const dateText = cellText(ws.getRow(r).getCell(dateCol));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) continue;
    const v = cellNum(ws.getRow(r).getCell(actualCol));
    if (v !== null) byMonthKey.set(dateText.slice(0, 7), v);
  }
  const out = new Map<number, number>();
  for (const [monthKey, value] of byMonthKey) out.set(Number(monthKey.slice(5, 7)), value);
  return out;
}

export type YeomjeonProductionMonthRow = {
  monthLabel: string; // "3월" ~ "10월" 또는 "합계"
  plan: number | null;
  actual: number | null;
  achievementRate: number | null; // actual / plan
  lastYearActual: number | null;
  vsLastYearRate: number | null; // actual / lastYearActual
  ytdThisYear: number | null;
  ytdLastYear: number | null;
  ytdRate: number | null; // ytdThisYear / ytdLastYear
};

export type YeomjeonFieldRow = {
  field: string; // "1공구" | "3공구" | "합계"
  weeklyActual: number | null;
  monthlyActual: number | null;
  annualActual: number | null;
  annualRatio: number | null; // 전체 대비 비중
  lastYearYtd: number | null; // 전년 동월 누계 생산량
  vsLastYearRate: number | null;
};

export type YeomjeonProductionSnapshot = {
  asOfDate: string;
  monthRows: YeomjeonProductionMonthRow[];
  fieldWeeklyPlan: number | null;
  fieldMonthlyPlan: number | null;
  fieldAnnualPlan: number | null;
  fieldRows: YeomjeonFieldRow[];
};

export type ParseYeomjeonProductionResult =
  | { ok: true; snapshot: YeomjeonProductionSnapshot }
  | { ok: false; errors: string[] };

function divide(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

export async function parseYeomjeonProductionWorkbook(buffer: Buffer): Promise<ParseYeomjeonProductionResult> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs Buffer 타입과 @types/node 버전이 어긋나 있음(기존 파서들과 동일한 처리)
  await wb.xlsx.load(buffer as any);

  const ws = wb.getWorksheet("생산-염전");
  if (!ws) return { ok: false, errors: ['"생산-염전" 시트를 찾을 수 없습니다.'] };

  const asOfDate = cellText(ws.getRow(2).getCell(colNum("BK")));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
    return { ok: false, errors: ['"생산-염전" 시트에서 기준일자를 찾지 못했습니다.'] };
  }
  const displayMonth = Number(asOfDate.slice(5, 7));

  // 이번 해 월별 생산목표(계획) — 4행(헤더: 총/3월~11월) + 5행(값), BA(총)~BI(10월).
  const planByMonth = readMonthlyByLabel(ws, 4, 5, colNum("BB"), colNum("BI"));
  const planTotal = cellNum(ws.getRow(5).getCell(colNum("BA")));

  // 이번 해 월별 실적 — 일자별 성긴 표(2열=일자, BG열=월간실적)를 훑어 월별 확정치를 얻는다.
  const actualByMonth = scanMonthlyActual(ws, 2, colNum("BG"));

  // 전년 동월 실적(고정 스냅샷) — 3행(헤더: 3월~10월) + 6행(총 실적), BU~CB.
  const lastYearActualByMonth = readMonthlyByLabel(ws, 3, 6, colNum("BU"), colNum("CB"));
  const lastYearTotal = cellNum(ws.getRow(6).getCell(colNum("CC")));

  // 전년 연누계(고정 스냅샷, 이미 누적된 값) — 3행(헤더: 3월~10월) + 6행, CE~CL.
  const lastYearYtdByMonth = readMonthlyByLabel(ws, 3, 6, colNum("CE"), colNum("CL"));

  const months = [3, 4, 5, 6, 7, 8, 9, 10];
  let ytdThisYear: number | null = null;
  const monthRows: YeomjeonProductionMonthRow[] = [];
  let actualSum = 0;
  let hasAnyActual = false;

  for (const m of months) {
    const plan = planByMonth.get(m) ?? null;
    const actual = actualByMonth.get(m) ?? null;
    if (actual !== null) {
      ytdThisYear = (ytdThisYear ?? 0) + actual;
      actualSum += actual;
      hasAnyActual = true;
    }
    const lastYearActual = lastYearActualByMonth.get(m) ?? null;
    const ytdLastYear = lastYearYtdByMonth.get(m) ?? null;
    monthRows.push({
      monthLabel: `${m}월`,
      plan,
      actual,
      achievementRate: divide(actual, plan),
      lastYearActual,
      vsLastYearRate: divide(actual, lastYearActual),
      ytdThisYear,
      ytdLastYear,
      ytdRate: divide(ytdThisYear, ytdLastYear),
    });
  }

  monthRows.push({
    monthLabel: "합계",
    plan: planTotal,
    actual: hasAnyActual ? actualSum : null,
    achievementRate: divide(hasAnyActual ? actualSum : null, planTotal),
    lastYearActual: lastYearTotal,
    vsLastYearRate: divide(hasAnyActual ? actualSum : null, lastYearTotal),
    ytdThisYear: hasAnyActual ? actualSum : null,
    ytdLastYear: lastYearTotal,
    ytdRate: divide(hasAnyActual ? actualSum : null, lastYearTotal),
  });

  // 공구별 스냅샷(4~6행, 64~70열) — 1공구/3공구/합계의 주간·월간·연간 실적 + 연간 비중.
  const fieldRowsRaw = [
    { field: "1공구", row: 4 },
    { field: "3공구", row: 5 },
    { field: "합계", row: 6 },
  ];
  // 전년동월 누계(당월 기준 — 예: 9월이면 9월 누계) 열 위치는 CE(3월)부터 달마다 한 칸씩 밀린다.
  const ytdLastYearCol = colNum("CE") + (displayMonth - 3);
  const fieldRows: YeomjeonFieldRow[] = fieldRowsRaw.map(({ field, row }) => {
    const r = ws.getRow(row);
    const weeklyActual = cellNum(r.getCell(65));
    const monthlyActual = cellNum(r.getCell(67));
    const annualActual = cellNum(r.getCell(69));
    const annualRatio = cellNum(r.getCell(70));
    const lastYearYtd = cellNum(r.getCell(ytdLastYearCol));
    return {
      field,
      weeklyActual,
      monthlyActual,
      annualActual,
      annualRatio,
      lastYearYtd,
      vsLastYearRate: divide(annualActual, lastYearYtd),
    };
  });

  return {
    ok: true,
    snapshot: {
      asOfDate,
      monthRows,
      fieldWeeklyPlan: null, // 원본에 주간계획 칸 자체가 비어 있음(월간/연간만 있음)
      fieldMonthlyPlan: planByMonth.get(displayMonth) ?? null,
      fieldAnnualPlan: planTotal,
      fieldRows,
    },
  };
}

import "server-only";
import ExcelJS from "exceljs";

// "주간_월간_업무보고" 워크북을 그대로 업로드하면, 그 안에 이미 있는 목표(계획) 수치를 정해진
// 위치에서 자동으로 뽑아온다. 매출 3개 시트(매출-태평소금1/매출-태평염전1/매출-서비스1)는
// 모두 "일자별로 한 행 + 그 행 안에 12열짜리 블록(주간계획/주간실적/계획비/월간계획/월간실적/
// 월간달성율/월누적계획/월누적실적/월누적달성율/연간계획/연간실적/연간진행율)" 구조를 공유한다.
//
// 이 표는 매일 채워지는 게 아니라 "보고서를 실제로 만든 날"에만 값이 들어있는 성긴 표다
// (실제 파일로 확인 — 예: 8/23, 8/30, 9/6처럼 매주 보고일에만 값이 있고 나머지는 빈 칸).
// 그래서 값이 채워진 행을 전부 스캔해서 그 날이 속한 주(월요일 기준)/월의 목표로 기록하면,
// 워크북 한 번 업로드로 그 안에 있던 과거 모든 주/월의 목표가 한꺼번에 채워진다.

type PeriodValue = { periodKey: string; value: number };

export type CorpTargetSeries = {
  corpCode: string; // '0460'|'0400'|'0360'|'0440'
  weekPlans: PeriodValue[]; // periodKey: 주 시작일(월요일, YYYY-MM-DD)
  monthPlans: PeriodValue[]; // periodKey: 'YYYY-MM'
};

export type ProductionTargetRow = {
  corpCode: string | null; // null=태평소금(기존 관행 유지), '0400'=태평염전
  category: "천일염" | "가공염";
  periodKey: string; // 'YYYY-MM'
  targetValue: number;
};

export type SeomdeulchaeUnitSeries = {
  businessUnit: string; // '소금가게'|'택배/쇼핑몰'|'소금아이스크림'|'해양힐링센터'|'카라반'|'소금항카페'
  weekPlans: PeriodValue[];
  monthPlans: PeriodValue[];
};

export type ParseWorkbookTargetsResult =
  | {
      ok: true;
      asOfDate: string;
      corpTargets: CorpTargetSeries[];
      productionTargets: ProductionTargetRow[];
      seomdeulchaeUnits: SeomdeulchaeUnitSeries[];
    }
  | { ok: false; errors: string[] };

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
    return null; // 수식 오류(#DIV/0! 등) 또는 문자 결과
  }
  return null;
}

function colNum(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

// 날짜가 속한 주의 월요일을 구한다(executive-targets.ts의 mondayOf()와 동일한 규칙).
function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=일 ... 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

// "팀보고" 시트 어딘가에 "마감일자" 라벨이 있고 같은 행의 다른 칸에 날짜가 들어있다.
// 위치가 바뀌어도 라벨을 찾아 그 옆(또는 근처)에서 날짜를 읽도록 라벨 기준으로 찾는다.
// (이 값 자체는 이제 어느 행을 읽을지 고르는 데는 안 쓰고, 업로드 결과 표시용으로만 쓴다.)
function findAsOfDate(ws: ExcelJS.Worksheet): string | null {
  for (let r = 1; r <= Math.min(ws.rowCount, 30); r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= Math.min(ws.columnCount, 30); c++) {
      if (cellText(row.getCell(c)).includes("마감일자")) {
        for (let c2 = c + 1; c2 <= c + 5; c2++) {
          const t = cellText(row.getCell(c2));
          if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
        }
      }
    }
  }
  return null;
}

// dateCol(보통 B열)에 값이 있는 모든 행을 스캔해서, blockStartCol부터 시작하는 12칸짜리
// 블록에서 그 행에 실제로 채워진 주간계획/월간계획을 전부 모은다. 실적은 이제 이 워크북이
// 아니라 섬들채 POS 원시 판매 데이터 업로드(매출업로드)에서 가져온다 — 계획과 실적의 출처를
// 분리해 서로 다른 담당자가 각자의 자료를 올려도 섞이지 않게 한다.
function readDailyPlanSeries(
  ws: ExcelJS.Worksheet,
  dateCol: number,
  blockStartCol: string,
): { weekPlans: PeriodValue[]; monthPlans: PeriodValue[] } {
  const start = colNum(blockStartCol);
  const weekPlans = new Map<string, number>();
  const monthPlans = new Map<string, number>();

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const dateText = cellText(row.getCell(dateCol));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) continue;

    const weekVal = cellNum(row.getCell(start));
    if (weekVal !== null) weekPlans.set(mondayOf(dateText), weekVal);

    // 월간계획은 같은 달 안에서 여러 번(매주 보고서마다) 반복 기록되므로, 날짜 순으로
    // 훑으면서 늦은 값으로 계속 덮어써 가장 최근 값을 쓴다.
    const monthVal = cellNum(row.getCell(start + 3));
    if (monthVal !== null) monthPlans.set(dateText.slice(0, 7), monthVal);
  }

  return {
    weekPlans: [...weekPlans.entries()].map(([periodKey, value]) => ({ periodKey, value })),
    monthPlans: [...monthPlans.entries()].map(([periodKey, value]) => ({ periodKey, value })),
  };
}

// 여러 시리즈(예: 섬들채 6개 업장)를 같은 periodKey끼리 더한다. 전부 다 그 기간의 값을
// 가지고 있을 때만 합산해서, 일부 업장 데이터가 빠진 기간을 실제보다 적게 보여주지 않는다.
function sumSeriesAcrossUnits(seriesList: PeriodValue[][]): PeriodValue[] {
  const keys = new Set<string>();
  for (const series of seriesList) for (const p of series) keys.add(p.periodKey);

  const out: PeriodValue[] = [];
  for (const key of keys) {
    const values = seriesList.map((series) => series.find((p) => p.periodKey === key)?.value);
    if (values.every((v) => v !== undefined)) {
      out.push({ periodKey: key, value: values.reduce((sum, v) => sum + (v as number), 0) });
    }
  }
  return out;
}

// 생산-소금/생산-염전처럼 "구분 행 + 총/1월~12월 열"로 된 단순 월간 매트릭스에서, 헤더 라벨로
// 월을 찾아 그 달의 값을 읽는다. "총"(합계) 열은 건너뛴다. (이 표는 성긴 일자별 표가 아니라
// 12개월이 항상 다 있는 고정폭 표라 스캔 없이 그대로 읽으면 된다.)
function readMonthlyRow(
  ws: ExcelJS.Worksheet,
  headerRow: number,
  valueRow: number,
  startCol: number,
  endCol: number,
  year: number,
): PeriodValue[] {
  const out: PeriodValue[] = [];
  const header = ws.getRow(headerRow);
  const value = ws.getRow(valueRow);
  for (let c = startCol; c <= endCol; c++) {
    const label = cellText(header.getCell(c));
    const m = label.match(/^(\d{1,2})월$/);
    if (!m) continue;
    const v = cellNum(value.getCell(c));
    if (v === null) continue;
    out.push({ periodKey: `${year}-${m[1].padStart(2, "0")}`, value: v });
  }
  return out;
}

export async function parseReportWorkbookTargets(buffer: Buffer): Promise<ParseWorkbookTargetsResult> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs Buffer 타입과 @types/node 버전이 어긋나 있음(기존 파서들과 동일한 처리)
  await wb.xlsx.load(buffer as any);

  const errors: string[] = [];

  const teamReportWs = wb.getWorksheet("팀보고");
  if (!teamReportWs) return { ok: false, errors: ['"팀보고" 시트를 찾을 수 없습니다.'] };

  const asOfDate = findAsOfDate(teamReportWs);
  if (!asOfDate) return { ok: false, errors: ['"팀보고" 시트에서 마감일자를 찾지 못했습니다.'] };
  const year = Number(asOfDate.slice(0, 4));

  const corpTargets: CorpTargetSeries[] = [];

  // 태평소금(법인 전체) — 매출-태평소금1, AJ열부터
  const taepyeongSogeumWs = wb.getWorksheet("매출-태평소금1");
  if (!taepyeongSogeumWs) {
    errors.push('"매출-태평소금1" 시트를 찾을 수 없습니다.');
  } else {
    corpTargets.push({ corpCode: "0460", ...readDailyPlanSeries(taepyeongSogeumWs, 2, "AJ") });
  }

  // 태평염전(법인 전체) — 매출-태평염전1. 이 시트는 다른 두 매출 시트와 달리 일자별 성긴
  // 표가 목표값의 신뢰할 수 있는 출처가 아니다(실측 결과 L열부터 시작하는 블록에 계획비 다음
  // 빈 칸이 하나 끼어 있어 열이 하나씩 밀려 읽힘). 대신 4행(헤더: 총/1월~12월)+5행(값)에
  // 항상 다 채워져 있는 "월별 목표" 표(N~AA열)에서 월간계획만 바로 읽는다. 주간계획은 이
  // 시트에 별도로 없고, 실측해보니 성긴 표에 어쩌다 있는 값도 월간계획을 그 달 일수로 나눠
  // 7을 곱한 값과 정확히 같았다 — 즉 원본 자체가 "주간계획 = 월간계획/일수*7"로 계산해 넣은
  // 값이라, 굳이 성긴 표에서 따로 읽지 않고 조회 시점에 executive-report.ts에서 월간계획으로
  // 그때그때 계산한다(월간계획이 이 표 덕분에 항상 있으니 주간계획도 항상 계산 가능해진다).
  const taepyeongYeomjeonWs = wb.getWorksheet("매출-태평염전1");
  if (!taepyeongYeomjeonWs) {
    errors.push('"매출-태평염전1" 시트를 찾을 수 없습니다.');
  } else {
    corpTargets.push({
      corpCode: "0400",
      weekPlans: [],
      monthPlans: readMonthlyRow(taepyeongYeomjeonWs, 4, 5, colNum("N"), colNum("AA"), year),
    });
  }

  // 섬들채 업장별(6개) + 박물관 — 매출-서비스1. 섬들채 법인 전체(0360)는 6개 업장을
  // 기간별로 합산해서 만든다(원본 "전체" 블록은 신뢰하지 않음 — TASK-002에서 실적 기준
  // 불일치를 확인한 바 있어 계획도 같은 방식으로 직접 계산해 화면과 항상 맞아떨어지게 한다).
  const seomdeulchaeUnits: SeomdeulchaeUnitSeries[] = [];
  const serviceWs = wb.getWorksheet("매출-서비스1");
  if (!serviceWs) {
    errors.push('"매출-서비스1" 시트를 찾을 수 없습니다.');
  } else {
    const unitBlocks: { unit: string; col: string }[] = [
      { unit: "소금가게", col: "AJ" },
      { unit: "택배/쇼핑몰", col: "AV" },
      { unit: "소금아이스크림", col: "BH" },
      { unit: "해양힐링센터", col: "BT" },
      { unit: "카라반", col: "CF" },
      { unit: "소금항카페", col: "CR" },
    ];
    for (const { unit, col } of unitBlocks) {
      seomdeulchaeUnits.push({ businessUnit: unit, ...readDailyPlanSeries(serviceWs, 2, col) });
    }

    corpTargets.push({
      corpCode: "0360",
      weekPlans: sumSeriesAcrossUnits(seomdeulchaeUnits.map((u) => u.weekPlans)),
      monthPlans: sumSeriesAcrossUnits(seomdeulchaeUnits.map((u) => u.monthPlans)),
    });
    corpTargets.push({ corpCode: "0440", ...readDailyPlanSeries(serviceWs, 2, "DD") });
  }

  // 생산목표(월간만) — 태평소금: 생산-소금 V5(천일염)/V6(가공염), W=총(건너뜀)/X~AI=1~12월
  const productionTargets: ProductionTargetRow[] = [];
  const saltProductionWs = wb.getWorksheet("생산-소금");
  if (!saltProductionWs) {
    errors.push('"생산-소금" 시트를 찾을 수 없습니다.');
  } else {
    for (const [category, row] of [
      ["천일염", 5],
      ["가공염", 6],
    ] as const) {
      const months = readMonthlyRow(saltProductionWs, 3, row, colNum("W"), colNum("AI"), year);
      for (const { periodKey, value } of months) {
        productionTargets.push({ corpCode: null, category, periodKey, targetValue: value });
      }
    }
  }

  // 염전 생산목표(월간만) — 생산-염전, BA=총(건너뜀)/BB~BJ=3~11월, 태평염전(0400) 소속 "천일염"
  const yeomjeonProductionWs = wb.getWorksheet("생산-염전");
  if (!yeomjeonProductionWs) {
    errors.push('"생산-염전" 시트를 찾을 수 없습니다.');
  } else {
    const months = readMonthlyRow(yeomjeonProductionWs, 4, 5, colNum("BA"), colNum("BJ"), year);
    for (const { periodKey, value } of months) {
      productionTargets.push({ corpCode: "0400", category: "천일염", periodKey, targetValue: value });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, asOfDate, corpTargets, productionTargets, seomdeulchaeUnits };
}

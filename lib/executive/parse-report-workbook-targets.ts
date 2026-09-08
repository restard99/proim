import "server-only";
import ExcelJS from "exceljs";

// "주간_월간_업무보고" 워크북을 그대로 업로드하면, 그 안에 이미 있는 목표(계획)·실적 수치를
// 정해진 위치에서 자동으로 뽑아온다. 매출 3개 시트(매출-태평소금1/매출-태평염전1/매출-서비스1)는
// 모두 "일자별로 한 행 + 그 행 안에 12열짜리 블록(주간계획/주간실적/계획비/월간계획/월간실적/
// 월간달성율/월누적계획/월누적실적/월누적달성율/연간계획/연간실적/연간진행율)" 구조를 공유한다.
// "팀보고" 시트의 마감일자와 같은 날짜의 행을 찾아 그 블록을 읽으면, 하드코딩된 셀 좌표 없이도
// 매주 다른 파일에서 항상 최신 마감일자 기준 수치를 정확히 가져올 수 있다.

export type CorpTargetRow = {
  corpCode: string; // '0460'|'0400'|'0440'
  weekPlan: number | null;
  monthPlan: number | null;
};

export type ProductionTargetRow = {
  corpCode: string | null; // null=태평소금(기존 관행 유지), '0400'=태평염전
  category: "천일염" | "가공염";
  periodKey: string; // 'YYYY-MM'
  targetValue: number;
};

export type SeomdeulchaeUnitRow = {
  businessUnit: string; // '전체'|'소금가게'|'택배/쇼핑몰'|'소금아이스크림'|'해양힐링센터'|'카라반'|'소금항카페'|'박물관'
  weekPlan: number | null;
  weekActual: number | null;
  monthPlan: number | null;
  monthActual: number | null;
};

export type ParseWorkbookTargetsResult =
  | {
      ok: true;
      asOfDate: string;
      corpTargets: CorpTargetRow[];
      productionTargets: ProductionTargetRow[];
      seomdeulchaeUnits: SeomdeulchaeUnitRow[];
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

// "팀보고" 시트 어딘가에 "마감일자" 라벨이 있고 같은 행의 다른 칸에 날짜가 들어있다.
// 위치가 바뀌어도 라벨을 찾아 그 옆(또는 근처)에서 날짜를 읽도록 라벨 기준으로 찾는다.
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

// dateCol(보통 B열)에서 asOfDate와 같은 날짜를 찾아, blockStartCol부터 12칸짜리 블록을 읽는다.
function readDailyBlock(
  ws: ExcelJS.Worksheet,
  dateCol: number,
  blockStartCol: string,
  asOfDate: string,
): { weekPlan: number | null; weekActual: number | null; monthPlan: number | null; monthActual: number | null } | null {
  let matchedRow = -1;
  for (let r = 1; r <= ws.rowCount; r++) {
    if (cellText(ws.getRow(r).getCell(dateCol)) === asOfDate) {
      matchedRow = r;
      break;
    }
  }
  if (matchedRow === -1) return null;

  const start = colNum(blockStartCol);
  const row = ws.getRow(matchedRow);
  return {
    weekPlan: cellNum(row.getCell(start)), // 0: 주간계획
    weekActual: cellNum(row.getCell(start + 1)), // 1: 주간실적
    monthPlan: cellNum(row.getCell(start + 3)), // 3: 월간계획
    monthActual: cellNum(row.getCell(start + 4)), // 4: 월간실적
  };
}

// 생산-소금/생산-염전처럼 "구분 행 + 총/1월~12월 열"로 된 단순 월간 매트릭스에서, 헤더 라벨로
// 월을 찾아 그 달의 값을 읽는다. "총"(합계) 열은 건너뛴다.
function readMonthlyRow(
  ws: ExcelJS.Worksheet,
  headerRow: number,
  valueRow: number,
  startCol: number,
  endCol: number,
  year: number,
): { periodKey: string; value: number }[] {
  const out: { periodKey: string; value: number }[] = [];
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

  const corpTargets: CorpTargetRow[] = [];

  // 태평소금(법인 전체) — 매출-태평소금1, AJ열부터
  const taepyeongSogeumWs = wb.getWorksheet("매출-태평소금1");
  if (!taepyeongSogeumWs) {
    errors.push('"매출-태평소금1" 시트를 찾을 수 없습니다.');
  } else {
    const block = readDailyBlock(taepyeongSogeumWs, 2, "AJ", asOfDate);
    if (!block) errors.push(`"매출-태평소금1" 시트에서 마감일자(${asOfDate}) 행을 찾지 못했습니다.`);
    else corpTargets.push({ corpCode: "0460", weekPlan: block.weekPlan, monthPlan: block.monthPlan });
  }

  // 태평염전(법인 전체) — 매출-태평염전1, L열부터
  const taepyeongYeomjeonWs = wb.getWorksheet("매출-태평염전1");
  if (!taepyeongYeomjeonWs) {
    errors.push('"매출-태평염전1" 시트를 찾을 수 없습니다.');
  } else {
    const block = readDailyBlock(taepyeongYeomjeonWs, 2, "L", asOfDate);
    if (!block) errors.push(`"매출-태평염전1" 시트에서 마감일자(${asOfDate}) 행을 찾지 못했습니다.`);
    else corpTargets.push({ corpCode: "0400", weekPlan: block.weekPlan, monthPlan: block.monthPlan });
  }

  // 섬들채 업장별 + 박물관 — 매출-서비스1, 업장 6개 + 박물관 블록
  // "전체" 블록은 원본에 그대로 있지만(X열) 계획은 6개 업장 합과 일치하는데 실적은 박물관까지
  // 포함된 값이 들어있어(실제 파일로 확인된 원본의 불일치) 믿지 않는다. "합계" 행은 항상
  // 아래 나열된 6개 업장의 합으로 직접 계산해, 화면에 보이는 개별 행들과 항상 맞아떨어지게 한다.
  const seomdeulchaeUnits: SeomdeulchaeUnitRow[] = [];
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
    const museumBlock = readDailyBlock(serviceWs, 2, "DD", asOfDate);
    if (!museumBlock) errors.push(`"매출-서비스1" 시트에서 "박물관"(DD열) 마감일자(${asOfDate}) 행을 찾지 못했습니다.`);

    const unitRows: SeomdeulchaeUnitRow[] = [];
    for (const { unit, col } of unitBlocks) {
      const block = readDailyBlock(serviceWs, 2, col, asOfDate);
      if (!block) {
        errors.push(`"매출-서비스1" 시트에서 "${unit}"(${col}열) 마감일자(${asOfDate}) 행을 찾지 못했습니다.`);
        continue;
      }
      unitRows.push({ businessUnit: unit, ...block });
    }

    if (unitRows.length === unitBlocks.length) {
      const sum = (pick: (r: SeomdeulchaeUnitRow) => number | null) =>
        unitRows.reduce((s, r) => (pick(r) === null ? s : s + (pick(r) as number)), 0);
      const total: SeomdeulchaeUnitRow = {
        businessUnit: "전체",
        weekPlan: sum((r) => r.weekPlan),
        weekActual: sum((r) => r.weekActual),
        monthPlan: sum((r) => r.monthPlan),
        monthActual: sum((r) => r.monthActual),
      };
      seomdeulchaeUnits.push(total, ...unitRows);
      corpTargets.push({ corpCode: "0360", weekPlan: total.weekPlan, monthPlan: total.monthPlan });
    }
    if (museumBlock) {
      seomdeulchaeUnits.push({ businessUnit: "박물관", ...museumBlock });
      corpTargets.push({ corpCode: "0440", weekPlan: museumBlock.weekPlan, monthPlan: museumBlock.monthPlan });
    }
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

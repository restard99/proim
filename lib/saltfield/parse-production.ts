import "server-only";
import ExcelJS from "exceljs";

const SHEET_NAME = "생산-염전";
const HEADER_ROW = 10;
const DATE_COL = 2; // B
const DAILY_TOTAL_COL = 6; // F
const FIELD_START_COL = 7; // G
const WEEKLY_PLAN_LABEL = "주간계획";

export type SaltfieldFieldData = Record<string, number>;

export type SaltfieldProductionRow = {
  recordDate: string; // YYYY-MM-DD
  dailyTotal: number;
  fieldData: SaltfieldFieldData;
  weeklyPlan: number | null;
  weeklyActual: number | null;
  planRatio: number | null;
  monthlyPlan: number | null;
  monthlyActual: number | null;
  monthlyAchievementRate: number | null;
  monthlyCumPlan: number | null;
  monthlyCumActual: number | null;
  monthlyCumRate: number | null;
  annualPlan: number | null;
  annualActual: number | null;
  annualProgressRate: number | null;
};

function cellNumber(cell: ExcelJS.Cell): number | null {
  const v = cell.value;
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const r = (v as { result?: unknown }).result;
    if (typeof r === "number") return r;
  }
  return null;
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const obj = v as { richText?: { text: string }[]; result?: unknown };
    if (obj.richText) return obj.richText.map((t) => t.text).join("");
    if (typeof obj.result === "string") return obj.result;
  }
  return "";
}

function cellDate(cell: ExcelJS.Cell): Date | null {
  return cell.value instanceof Date ? cell.value : null;
}

export async function parseSaltfieldProductionWorkbook(buffer: Buffer): Promise<SaltfieldProductionRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.getWorksheet(SHEET_NAME);
  if (!ws) throw new Error(`"${SHEET_NAME}" 탭을 찾을 수 없습니다.`);

  const headerRow = ws.getRow(HEADER_ROW);

  // 호수 라벨을 헤더에서 동적으로 읽어, "주간계획" 라벨이 나오는 열 직전까지를
  // 공구/호수 데이터 열로 간주한다 (열 구성이 바뀌어도 하드코딩 없이 대응).
  const fieldCols: { col: number; label: string }[] = [];
  let weeklyPlanCol = -1;
  for (let c = FIELD_START_COL; c <= ws.columnCount; c++) {
    const label = cellText(headerRow.getCell(c));
    if (label === WEEKLY_PLAN_LABEL) {
      weeklyPlanCol = c;
      break;
    }
    if (label) fieldCols.push({ col: c, label });
  }
  if (weeklyPlanCol === -1) {
    throw new Error(`"${WEEKLY_PLAN_LABEL}" 열을 찾지 못했습니다. 엑셀 양식을 확인해주세요.`);
  }
  if (fieldCols.length === 0) {
    throw new Error("공구/호수 열을 찾지 못했습니다. 엑셀 양식을 확인해주세요.");
  }

  // AZ=주간계획, BA/BB/BC=1/2/3공구 주간소계, BD=주간실적, BE=계획비,
  // BF=월간계획, BG=월간실적, BH=달성율, BI=월누적계획, BJ=월누적실적, BK=달성율,
  // BL=연간계획, BM=연간실적, BN=진행율 — 구조가 고정돼 있어 상대 오프셋으로 찾는다.
  const weeklyActualCol = weeklyPlanCol + 4;
  const planRatioCol = weeklyActualCol + 1;
  const monthlyPlanCol = planRatioCol + 1;
  const monthlyActualCol = monthlyPlanCol + 1;
  const monthlyRateCol = monthlyActualCol + 1;
  const monthlyCumPlanCol = monthlyRateCol + 1;
  const monthlyCumActualCol = monthlyCumPlanCol + 1;
  const monthlyCumRateCol = monthlyCumActualCol + 1;
  const annualPlanCol = monthlyCumRateCol + 1;
  const annualActualCol = annualPlanCol + 1;
  const annualRateCol = annualActualCol + 1;

  const rows: SaltfieldProductionRow[] = [];
  for (let r = HEADER_ROW + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const date = cellDate(row.getCell(DATE_COL));
    if (!date) continue;

    const dailyTotal = cellNumber(row.getCell(DAILY_TOTAL_COL));
    if (!dailyTotal) continue; // 값이 실제로 채워진 날짜만 저장 (빈 연간 템플릿 행 제외)

    const fieldData: SaltfieldFieldData = {};
    for (const { col, label } of fieldCols) {
      fieldData[label] = cellNumber(row.getCell(col)) ?? 0;
    }

    rows.push({
      recordDate: date.toISOString().slice(0, 10),
      dailyTotal,
      fieldData,
      weeklyPlan: cellNumber(row.getCell(weeklyPlanCol)),
      weeklyActual: cellNumber(row.getCell(weeklyActualCol)),
      planRatio: cellNumber(row.getCell(planRatioCol)),
      monthlyPlan: cellNumber(row.getCell(monthlyPlanCol)),
      monthlyActual: cellNumber(row.getCell(monthlyActualCol)),
      monthlyAchievementRate: cellNumber(row.getCell(monthlyRateCol)),
      monthlyCumPlan: cellNumber(row.getCell(monthlyCumPlanCol)),
      monthlyCumActual: cellNumber(row.getCell(monthlyCumActualCol)),
      monthlyCumRate: cellNumber(row.getCell(monthlyCumRateCol)),
      annualPlan: cellNumber(row.getCell(annualPlanCol)),
      annualActual: cellNumber(row.getCell(annualActualCol)),
      annualProgressRate: cellNumber(row.getCell(annualRateCol)),
    });
  }

  return rows;
}

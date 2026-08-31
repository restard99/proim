import "server-only";
import ExcelJS from "exceljs";

// 사용자가 준 실제 참고 워크북("섬들채_1-8월_월별업장별_손익_수식.xlsx")의 업장별 시트
// (예: "01_소금가게", "06_힐링카라반") 구조를 그대로 읽는다. 시트당 레이아웃:
//   1행: 제목, 2행: 안내문구, 3행: 공백, 4행: 헤더("구분 | 1월 | 2월 | ... | 8월(추정) | 1~8월 누계")
//   5행 이후: "Ⅰ. 매출액", "Ⅱ. 매출원가", "Ⅳ. 판관비(배분)", "Ⅵ. 영업외수익(배분)", "Ⅶ. 영업외비용(배분)" 등
// 매출총이익/영업이익/세전이익(Ⅲ/Ⅴ/Ⅷ)은 계산값이라 읽지 않고 화면에서 다시 계산한다.
// "N월 누계" 컬럼은 무시하고, 업로드마다 있는 월 컬럼만 그대로 반영한다(다음 달 업로드 시 새 컬럼이 추가돼도 대응 가능).
const KNOWN_UNITS = ["소금가게", "쇼핑몰", "소금항카페", "힐링스파", "아이스크림", "힐링카라반"];

export type ParsedBusinessUnitRow = {
  businessUnit: string;
  yearMonth: string;
  revenue: number | null;
  cogs: number | null;
  sga: number | null;
  nonOperatingIncome: number | null;
  nonOperatingExpense: number | null;
};

export type ParseBusinessUnitResult =
  | { ok: true; rows: ParsedBusinessUnitRow[] }
  | { ok: false; errors: string[] };

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") {
    const obj = v as { richText?: { text: string }[]; result?: unknown };
    if (obj.richText) return obj.richText.map((t) => t.text).join("").trim();
    if (typeof obj.result === "string") return obj.result.trim();
  }
  return "";
}

function cellNumber(cell: ExcelJS.Cell): number | null {
  const v = cell.value;
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const r = (v as { result?: unknown }).result;
    if (typeof r === "number") return r;
  }
  const text = cellText(cell).replace(/,/g, "");
  if (!text || text === "-") return text === "-" ? 0 : null;
  const n = Number(text.replace(/^\((.+)\)$/, "-$1")); // "(1,234)" 같은 음수 표기 지원
  return Number.isNaN(n) ? null : n;
}

function sheetUnitName(sheetName: string): string | null {
  const withoutPrefix = sheetName.replace(/^\d+_/, "");
  return KNOWN_UNITS.includes(withoutPrefix) ? withoutPrefix : null;
}

export async function parsePlBusinessUnitWorkbook(buffer: Buffer, year: number): Promise<ParseBusinessUnitResult> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs의 Buffer 타입과 @types/node 버전이 어긋나 있음 (기존 parse-production.ts와 동일한 처리)
  await wb.xlsx.load(buffer as any);

  const rows: ParsedBusinessUnitRow[] = [];
  const errors: string[] = [];
  let matchedAnySheet = false;

  wb.eachSheet((ws) => {
    const businessUnit = sheetUnitName(ws.name);
    if (!businessUnit) return; // 07/08/09 등 요약·대조 시트는 건너뜀
    matchedAnySheet = true;

    let headerRow = -1;
    for (let r = 1; r <= Math.min(ws.rowCount, 10); r++) {
      if (cellText(ws.getRow(r).getCell(1)) === "구분") {
        headerRow = r;
        break;
      }
    }
    if (headerRow === -1) {
      errors.push(`"${ws.name}" 시트: "구분" 헤더 행을 찾지 못했습니다.`);
      return;
    }

    const header = ws.getRow(headerRow);
    // header.cellCount가 시트 전체 폭(최대 16384)을 반환하는 경우가 있어, 실제로 쓰는 범위(구분+월×12+누계)로 제한한다.
    const maxCol = Math.min(header.cellCount + 1, 20);
    const monthColumns: { col: number; month: number }[] = [];
    for (let c = 2; c <= maxCol; c++) {
      const text = cellText(header.getCell(c));
      const m = text.match(/^(\d{1,2})월/);
      if (m) monthColumns.push({ col: c, month: Number(m[1]) });
    }
    if (monthColumns.length === 0) {
      errors.push(`"${ws.name}" 시트: 월 컬럼("1월","2월"...)을 찾지 못했습니다.`);
      return;
    }

    const values = new Map<number, { revenue?: number | null; cogs?: number | null; sga?: number | null; nonOpIncome?: number | null; nonOpExpense?: number | null }>();
    for (const { month } of monthColumns) values.set(month, {});

    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const label = cellText(ws.getRow(r).getCell(1));
      if (!label) continue;
      let field: "revenue" | "cogs" | "sga" | "nonOpIncome" | "nonOpExpense" | null = null;
      if (label.includes("매출액")) field = "revenue";
      else if (label.includes("매출원가")) field = "cogs";
      else if (label.includes("판관비")) field = "sga";
      else if (label.includes("영업외수익")) field = "nonOpIncome";
      else if (label.includes("영업외비용")) field = "nonOpExpense";
      if (!field) continue;

      for (const { col, month } of monthColumns) {
        const entry = values.get(month)!;
        entry[field] = cellNumber(ws.getRow(r).getCell(col));
      }
    }

    for (const { month } of monthColumns) {
      const v = values.get(month)!;
      rows.push({
        businessUnit,
        yearMonth: `${year}-${String(month).padStart(2, "0")}`,
        revenue: v.revenue ?? null,
        cogs: v.cogs ?? null,
        sga: v.sga ?? null,
        nonOperatingIncome: v.nonOpIncome ?? null,
        nonOperatingExpense: v.nonOpExpense ?? null,
      });
    }
  });

  if (!matchedAnySheet) {
    return {
      ok: false,
      errors: [`업장별 시트를 찾지 못했습니다. 시트 이름이 "01_소금가게"처럼 번호_업장명 형식이어야 합니다.`],
    };
  }
  if (errors.length > 0) return { ok: false, errors };
  if (rows.length === 0) return { ok: false, errors: ["값이 채워진 행을 찾지 못했습니다."] };
  return { ok: true, rows };
}

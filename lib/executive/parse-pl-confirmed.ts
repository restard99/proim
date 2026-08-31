import "server-only";
import ExcelJS from "exceljs";
import { EXECUTIVE_PL_CORPS } from "@/lib/yerp/executive-corps";

const DATA_START_ROW = 2;
const CORP_NAME_TO_CODE = new Map<string, string>(EXECUTIVE_PL_CORPS.map((c) => [c.corpName, c.corpCode]));

export type ParsedPlConfirmedRow = {
  corpCode: string;
  yearMonth: string;
  revenue: number | null;
  cogs: number | null;
  sga: number | null;
  nonOperatingIncome: number | null;
  nonOperatingExpense: number | null;
};

export type ParsePlConfirmedResult =
  | { ok: true; rows: ParsedPlConfirmedRow[] }
  | { ok: false; errors: string[] };

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (typeof v === "string") return v.trim();
  if (v instanceof Date) return v.toISOString().slice(0, 7);
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
  const asText = cellText(cell);
  const n = Number(asText.replace(/,/g, ""));
  return asText && !Number.isNaN(n) ? n : null;
}

export async function parsePlConfirmedWorkbook(buffer: Buffer): Promise<ParsePlConfirmedResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  if (!ws) return { ok: false, errors: ["시트를 찾을 수 없습니다."] };

  const rows: ParsedPlConfirmedRow[] = [];
  const errors: string[] = [];

  for (let r = DATA_START_ROW; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const corpLabel = cellText(row.getCell(1));
    if (!corpLabel) continue;

    const yearMonth = cellText(row.getCell(2));
    const corpCode = CORP_NAME_TO_CODE.get(corpLabel);

    if (!corpCode) {
      errors.push(`${r}행: 법인명 "${corpLabel}"을 찾을 수 없습니다 (태평소금/태평염전/섬들채 중 하나여야 함)`);
      continue;
    }
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      errors.push(`${r}행: 년월 형식이 올바르지 않습니다 (YYYY-MM, 입력값: "${yearMonth}")`);
      continue;
    }

    rows.push({
      corpCode,
      yearMonth,
      revenue: cellNumber(row.getCell(3)),
      cogs: cellNumber(row.getCell(4)),
      sga: cellNumber(row.getCell(5)),
      nonOperatingIncome: cellNumber(row.getCell(6)),
      nonOperatingExpense: cellNumber(row.getCell(7)),
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  if (rows.length === 0) return { ok: false, errors: ["값이 채워진 행을 찾지 못했습니다."] };
  return { ok: true, rows };
}

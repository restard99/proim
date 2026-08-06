import "server-only";
import ExcelJS from "exceljs";

export type ProductionRequestItem = {
  name: string;
  count: string;
  pack: string;
  boxes: string;
  weightKg: string;
  pl: string;
  eaPerPl: string;
  note: string;
  loadType: string;
  dueDate: string;
  remark: string;
};

export type ProductionRequestSubItem = {
  name: string;
  amountKg: string;
};

export type ProductionRequestTotals = {
  count: string;
  weightKg: string;
  pl: string;
};

export type ParsedProductionRequest = {
  items: ProductionRequestItem[];
  subItems: ProductionRequestSubItem[];
  totals: ProductionRequestTotals | null;
};

const HEADER_LABEL = "제품명";
const SUB_HEADER_LABEL = "반제품명";
const MAX_COL = 15;

function numText(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toLocaleDateString("ko-KR");
  if (typeof v === "number") return numText(v);
  if (typeof v === "object") {
    const obj = v as { richText?: { text: string }[]; result?: unknown; text?: unknown };
    if (obj.richText) return obj.richText.map((t) => t.text).join("");
    if (obj.result !== undefined) {
      return typeof obj.result === "number" ? numText(obj.result) : String(obj.result ?? "");
    }
    if (obj.text !== undefined) return String(obj.text ?? "");
    return "";
  }
  return String(v).trim();
}

function isBlankRow(texts: string[]): boolean {
  return texts.every((t) => t.trim() === "");
}

export async function parseProductionRequestWorkbook(buffer: Buffer): Promise<ParsedProductionRequest> {
  const wb = new ExcelJS.Workbook();
  // exceljs 타입 선언 내부의 Buffer는 (전역이 아니라) 자체 정의한 `extends ArrayBuffer`
  // 타입이라 Node의 실제 Buffer와 구조적으로 맞지 않는다. 런타임에는 정상 동작.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  if (!ws) return { items: [], subItems: [], totals: null };

  function rowTexts(r: number, maxCol = MAX_COL): string[] {
    const row = ws.getRow(r);
    const out: string[] = [];
    for (let c = 1; c <= maxCol; c++) out.push(cellText(row.getCell(c)));
    return out;
  }

  let headerRow = -1;
  for (let r = 1; r <= Math.min(ws.rowCount, 20); r++) {
    if (rowTexts(r, 1)[0] === HEADER_LABEL) {
      headerRow = r;
      break;
    }
  }
  if (headerRow === -1) return { items: [], subItems: [], totals: null };

  const items: ProductionRequestItem[] = [];
  let totals: ProductionRequestTotals | null = null;
  let subHeaderRow = -1;
  let cursor = headerRow + 1;

  for (; cursor <= ws.rowCount; cursor++) {
    const t = rowTexts(cursor);
    if (isBlankRow(t)) continue;
    if (t[0].replace(/\s/g, "") === "소계") {
      totals = { count: t[1], weightKg: t[4], pl: t[5] };
      cursor++;
      break;
    }
    if (t[0] === SUB_HEADER_LABEL) {
      subHeaderRow = cursor;
      break;
    }
    items.push({
      name: t[0],
      count: t[1],
      pack: t[2],
      boxes: t[3],
      weightKg: t[4],
      pl: t[5],
      eaPerPl: t[6],
      note: t[7],
      loadType: t[8],
      dueDate: t[9],
      remark: t.slice(10).filter(Boolean).join(" / "),
    });
  }

  if (subHeaderRow === -1) {
    for (; cursor <= ws.rowCount; cursor++) {
      if (rowTexts(cursor, 1)[0] === SUB_HEADER_LABEL) {
        subHeaderRow = cursor;
        break;
      }
    }
  }

  const subItems: ProductionRequestSubItem[] = [];
  if (subHeaderRow !== -1) {
    for (let r = subHeaderRow + 1; r <= ws.rowCount; r++) {
      const t = rowTexts(r, 7);
      const name1 = t[0];
      const amt1 = t[1];
      const name2 = t[4];
      const amt2 = t[6];
      if (!name1 && !name2) break;
      if (name1) subItems.push({ name: name1, amountKg: amt1 });
      if (name2) subItems.push({ name: name2, amountKg: amt2 });
    }
  }

  return { items, subItems, totals };
}

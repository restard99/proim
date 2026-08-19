import "server-only";
import ExcelJS from "exceljs";

const DATA_START_ROW = 5; // 4행은 헤더(업체명/품명/단가/이월재고/입고/입고누계/출고/출고누계/재고/재고금액/비고)
const MONTH_ORDER = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export type SaltfieldMaterialRow = {
  monthLabel: string;
  vendorName: string;
  itemName: string;
  unitPrice: number | null;
  carryoverQty: number | null;
  inboundQty: number | null;
  outboundQty: number | null;
  stockQty: number | null;
  stockValue: number | null;
  note: string | null;
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
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const obj = v as { richText?: { text: string }[]; result?: unknown };
    if (obj.richText) return obj.richText.map((t) => t.text).join("").trim();
    if (typeof obj.result === "string") return obj.result.trim();
  }
  return "";
}

export async function parseSaltfieldMaterialsWorkbook(buffer: Buffer): Promise<SaltfieldMaterialRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);

  const bySheet = new Map<string, SaltfieldMaterialRow[]>();
  wb.eachSheet((ws) => {
    const rows: SaltfieldMaterialRow[] = [];
    for (let r = DATA_START_ROW; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const itemName = cellText(row.getCell(2));
      if (!itemName) continue;

      rows.push({
        monthLabel: ws.name,
        vendorName: cellText(row.getCell(1)),
        itemName,
        unitPrice: cellNumber(row.getCell(3)),
        carryoverQty: cellNumber(row.getCell(4)),
        inboundQty: cellNumber(row.getCell(5)),
        outboundQty: cellNumber(row.getCell(7)),
        stockQty: cellNumber(row.getCell(9)),
        stockValue: cellNumber(row.getCell(10)),
        note: cellText(row.getCell(11)) || null,
      });
    }
    bySheet.set(ws.name, rows);
  });

  // Excel이 다른 시트를 참조하는 이월재고/재고 수식의 캐시된 결과값을 저장해두지 않는 경우가 많아
  // (실제 샘플 파일에서 시트당 약 2/3가 비어있었다), 월 순서대로 훑으면서
  // 이월재고 = 전월 재고, 재고 = 이월재고+입고-출고, 재고금액 = 재고*단가 로 직접 보정한다.
  // 원본에 캐시된 값이 있으면 그 값을 그대로 신뢰하고 덮어쓰지 않는다.
  const lastKnownStock = new Map<string, number>();
  const result: SaltfieldMaterialRow[] = [];

  for (const month of MONTH_ORDER) {
    const rows = bySheet.get(month);
    if (!rows) continue;

    for (const row of rows) {
      const key = `${row.vendorName}|${row.itemName}`;

      const carryoverQty = row.carryoverQty ?? lastKnownStock.get(key) ?? null;
      let stockQty = row.stockQty;
      if (stockQty === null && carryoverQty !== null) {
        stockQty = carryoverQty + (row.inboundQty ?? 0) - (row.outboundQty ?? 0);
      }
      const stockValue = row.stockValue ?? (stockQty !== null && row.unitPrice !== null ? stockQty * row.unitPrice : null);

      if (stockQty !== null) lastKnownStock.set(key, stockQty);

      result.push({ ...row, carryoverQty, stockQty, stockValue });
    }
  }

  return result;
}

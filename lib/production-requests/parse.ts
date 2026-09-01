import "server-only";
import ExcelJS from "exceljs";

export type ProductionRequestFieldKey =
  | "name"
  | "category"
  | "count"
  | "pack"
  | "boxes"
  | "weightKg"
  | "pl"
  | "eaPerPl"
  | "note"
  | "loadType"
  | "dueDate";

export type ProductionRequestMerge = {
  field: ProductionRequestFieldKey;
  colSpan: number;
  rowSpan: number;
};

export type ProductionRequestItem = {
  name: string;
  category: string;
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
  isRed: boolean;
  merge: ProductionRequestMerge | null;
  mergeSkip: ProductionRequestFieldKey[];
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
const RED_ARGB = "FFFF0000";

// "구분" 같은 열이 나중에 템플릿에 추가되어도 열 위치가 아니라 헤더 문구로 필드를 찾도록
// 라벨 매칭 규칙을 둔다 (FIX-010: 열이 하나 밀려서 데이터가 통째로 잘못 들어가던 문제).
type NamedFieldKey = Exclude<ProductionRequestFieldKey, "name">;
const FIELD_LABEL_MATCHERS: { field: NamedFieldKey; test: (label: string) => boolean }[] = [
  { field: "category", test: (l) => l.startsWith("구분") },
  { field: "count", test: (l) => l.startsWith("낱개수") },
  { field: "pack", test: (l) => l.startsWith("입수") },
  { field: "boxes", test: (l) => l.startsWith("박스수") },
  { field: "weightKg", test: (l) => l.startsWith("중량") },
  { field: "eaPerPl", test: (l) => l.startsWith("EA/PL") || l.startsWith("EA") },
  { field: "pl", test: (l) => l === "PL" },
  { field: "note", test: (l) => l.startsWith("특이사항") },
  { field: "loadType", test: (l) => l.startsWith("적재방식") },
  { field: "dueDate", test: (l) => l.startsWith("완료요청일") },
];

type ColumnMap = Partial<Record<NamedFieldKey, number>>;

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

function isRedFont(cell: ExcelJS.Cell): boolean {
  const color = cell.style?.font?.color as { argb?: string } | undefined;
  return color?.argb?.toUpperCase() === RED_ARGB;
}

function colLetterToNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function parseA1Range(range: string): { r1: number; c1: number; r2: number; c2: number } | null {
  const [a, b] = range.split(":");
  const m1 = a.match(/^([A-Z]+)(\d+)$/);
  if (!m1) return null;
  const m2 = (b ?? a).match(/^([A-Z]+)(\d+)$/);
  if (!m2) return null;
  return {
    r1: Number(m1[2]),
    c1: colLetterToNumber(m1[1]),
    r2: Number(m2[2]),
    c2: colLetterToNumber(m2[1]),
  };
}

// 헤더 행 문구를 읽어 필드→열번호 맵을 만든다. 열이 추가/재배치돼도 라벨만 같으면 정확히 찾는다.
function buildColumnMap(headerTexts: string[]): ColumnMap {
  const map: ColumnMap = {};
  for (let i = 1; i < headerTexts.length; i++) {
    const label = headerTexts[i].trim();
    if (!label) continue;
    const col = i + 1; // headerTexts는 0-based, 실제 엑셀 열 번호는 1-based
    for (const { field, test } of FIELD_LABEL_MATCHERS) {
      if (map[field] === undefined && test(label)) {
        map[field] = col;
        break;
      }
    }
  }
  return map;
}

function get(t: string[], col: number | undefined): string {
  return col ? (t[col - 1] ?? "") : "";
}

// 매핑된 필드 열을 제외한 나머지 열(예: 새로 추가된 "구분" 열, 템플릿 밖 자유 기재 열)의
// 값을 전부 비고에 모아준다 — 값을 잃어버리지 않고 눈에 보이는 곳에 남긴다.
function buildRemark(t: string[], mappedCols: Set<number>): string {
  const parts: string[] = [];
  for (let c = 2; c <= MAX_COL; c++) {
    if (mappedCols.has(c)) continue;
    const v = t[c - 1];
    if (v) parts.push(v);
  }
  return parts.join(" / ");
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

  const colMap = buildColumnMap(rowTexts(headerRow));
  const mappedCols = new Set(Object.values(colMap).filter((c): c is number => c !== undefined));
  const colToField = new Map<number, ProductionRequestFieldKey>([[1, "name"]]);
  for (const [field, col] of Object.entries(colMap) as [NamedFieldKey, number | undefined][]) {
    if (col !== undefined) colToField.set(col, field);
  }

  const itemsByRow = new Map<number, ProductionRequestItem>();
  let totals: ProductionRequestTotals | null = null;
  let subHeaderRow = -1;
  let cursor = headerRow + 1;
  let lastItemRow = headerRow;

  for (; cursor <= ws.rowCount; cursor++) {
    const t = rowTexts(cursor);
    if (isBlankRow(t)) continue;
    if (t[0].replace(/\s/g, "") === "소계") {
      totals = { count: get(t, colMap.count), weightKg: get(t, colMap.weightKg), pl: get(t, colMap.pl) };
      cursor++;
      break;
    }
    if (t[0] === SUB_HEADER_LABEL) {
      subHeaderRow = cursor;
      break;
    }
    itemsByRow.set(cursor, {
      name: t[0],
      category: get(t, colMap.category),
      count: get(t, colMap.count),
      pack: get(t, colMap.pack),
      boxes: get(t, colMap.boxes),
      weightKg: get(t, colMap.weightKg),
      pl: get(t, colMap.pl),
      eaPerPl: get(t, colMap.eaPerPl),
      note: get(t, colMap.note),
      loadType: get(t, colMap.loadType),
      dueDate: get(t, colMap.dueDate),
      remark: buildRemark(t, mappedCols),
      isRed: isRedFont(ws.getRow(cursor).getCell(1)),
      merge: null,
      mergeSkip: [],
    });
    lastItemRow = cursor;
  }

  // 원본 엑셀에서 여러 셀을 병합해 하나의 특이사항으로 강조 표기한 부분을
  // 동일하게 재현하기 위해, 제품 항목 영역(헤더~마지막 항목 행) 안에 걸친
  // 병합 범위만 골라 각 항목에 병합 정보를 붙인다.
  const merges = (ws.model.merges ?? []) as string[];
  for (const rangeStr of merges) {
    const range = parseA1Range(rangeStr);
    if (!range) continue;
    const { r1, c1, r2, c2 } = range;
    if (r1 < headerRow + 1 || r2 > lastItemRow) continue;
    if (r1 === r2 && c1 === c2) continue;

    const startField = colToField.get(c1);
    if (!startField || startField === "name") continue;

    const topItem = itemsByRow.get(r1);
    if (!topItem) continue;

    topItem.merge = {
      field: startField,
      colSpan: c2 - c1 + 1,
      rowSpan: r2 - r1 + 1,
    };

    for (let r = r1; r <= r2; r++) {
      const item = itemsByRow.get(r);
      if (!item) continue;
      for (let c = c1; c <= c2; c++) {
        if (r === r1 && c === c1) continue;
        const field = colToField.get(c);
        if (field && field !== "name") item.mergeSkip.push(field);
      }
    }
  }

  const items = [...itemsByRow.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, item]) => item);

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

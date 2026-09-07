import "server-only";
import ExcelJS from "exceljs";

// "원재료 및 반제품 입출고현황" 엑셀 — 시트 하나 안에 원재료·부재료 표와 반제품 표가
// 순서대로 들어있다. 두 표의 컬럼 구성은 동일하다.
export type MaterialInventoryFieldKey =
  | "seq"
  | "name"
  | "stockUnit"
  | "beginQty"
  | "weightUnit"
  | "inSlipQty"
  | "inActualQty"
  | "outSlipQty"
  | "outActualQty"
  | "yieldRate"
  | "currentQty"
  | "inCumQty"
  | "outCumQty"
  | "remark";

export type MaterialInventoryRow = {
  seq: string;
  name: string;
  stockUnit: string;
  beginQty: number | null;
  weightUnit: string;
  inSlipQty: number | null;
  inActualQty: number | null;
  outSlipQty: number | null;
  outActualQty: number | null;
  yieldRate: number | null;
  currentQty: number | null;
  inCumQty: number | null;
  outCumQty: number | null;
  remark: string;
};

export type MaterialInventoryTotals = {
  beginQty: number | null;
  inSlipQty: number | null;
  inActualQty: number | null;
  outSlipQty: number | null;
  outActualQty: number | null;
  currentQty: number | null;
  inCumQty: number | null;
  outCumQty: number | null;
};

export type MaterialInventorySection = {
  rows: MaterialInventoryRow[];
  totals: MaterialInventoryTotals | null;
};

export type ParsedProductionMaterialInventory = {
  snapshotDate: string | null; // "YYYY-MM-DD" — 엑셀 제목행에 적힌 기준일에서 추출
  rawMaterials: MaterialInventorySection;
  semiFinished: MaterialInventorySection;
};

const RAW_TITLE = "원재료 및 부재료 재고 목록";
const SEMI_TITLE = "반제품 재고 목록";
const MAX_COL = 15;
// 비고 값이 헤더가 있는 O열이 아니라 한 칸 옆인 P열에 입력된 행이 실제 파일에 섞여 있어
// (수기 작성 과정의 입력 위치 오차로 보임), 비고는 매핑된 열부터 이 열까지 훑어서 모은다.
const REMARK_SCAN_MAX_COL = MAX_COL + 2;

// 두 표 모두 헤더가 2행(row2: 큰 분류, row3: 세부 단위/구분)에 걸쳐 병합돼 있다. 위치가 아니라
// 라벨로 열을 찾아서, 서식이 조금 바뀌어도 안전하게 파싱한다(FIX-010 TASK-001과 동일한 접근).
// "단위" 라벨이 두 번(재고단위, 중량단위) 나오는데, 매처를 선언한 순서대로 "아직 채워지지 않은
// 첫 열"에 배정하는 구조라 왼쪽 열부터 순서대로 stockUnit → weightUnit에 자동으로 배정된다.
const FIELD_LABEL_MATCHERS: { field: MaterialInventoryFieldKey; test: (row2: string, row3: string) => boolean }[] = [
  { field: "seq", test: (r2) => r2 === "SEQ" },
  { field: "name", test: (r2) => r2 === "제품명" },
  // 원재료·부재료 표는 "단위", 반제품 표는 "재고단위"(줄바꿈 포함 "재고\n단위")로 라벨이 달라
  // 둘 다 받아들인다. weightUnit도 "단위"를 찾지만 이 매처가 먼저 선언돼 있어(첫 미배정 열
  // 우선) 재고단위 열을 먼저 가져가고, weightUnit은 그다음 "단위" 열로 자연스럽게 넘어간다.
  { field: "stockUnit", test: (r2) => r2 === "단위" || r2 === "재고단위" },
  { field: "beginQty", test: (r2) => r2.startsWith("기초재고") },
  { field: "weightUnit", test: (r2) => r2 === "단위" },
  { field: "inSlipQty", test: (r2, r3) => r2 === "입고" && r3.includes("전표") },
  { field: "inActualQty", test: (r2, r3) => r2 === "입고" && r3.includes("실입고") },
  { field: "outSlipQty", test: (r2, r3) => r2 === "출고" && r3.includes("전표") },
  { field: "outActualQty", test: (r2, r3) => r2 === "출고" && r3.includes("실투입") },
  { field: "yieldRate", test: (r2, r3) => r2 === "출고" && r3.includes("수율") },
  { field: "currentQty", test: (r2) => r2.startsWith("현재고") },
  { field: "inCumQty", test: (r2) => r2.startsWith("입고누계") },
  { field: "outCumQty", test: (r2) => r2.startsWith("출고누계") },
  { field: "remark", test: (r2) => r2.startsWith("비고") },
];

type ColumnMap = Partial<Record<MaterialInventoryFieldKey, number>>;

function buildColumnMap(row2Texts: string[], row3Texts: string[]): ColumnMap {
  const map: ColumnMap = {};
  for (let col = 1; col <= MAX_COL; col++) {
    const label2 = (row2Texts[col - 1] ?? "").replace(/\s+/g, "").trim();
    const label3 = (row3Texts[col - 1] ?? "").replace(/\s+/g, "").trim();
    if (!label2 && !label3) continue;
    for (const { field, test } of FIELD_LABEL_MATCHERS) {
      if (map[field] === undefined && test(label2, label3)) {
        map[field] = col;
        break;
      }
    }
  }
  return map;
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toLocaleDateString("ko-KR");
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    const obj = v as { richText?: { text: string }[]; result?: unknown; text?: unknown };
    if (obj.richText) return obj.richText.map((t) => t.text).join("");
    // 수식 셀(합계 행의 SUM 등)은 결과가 숫자인 경우도 흔하다 — 문자열만 읽으면 "빈 행"으로
    // 잘못 판정돼(isBlankRow) 합계 행을 건너뛰게 되므로 숫자 결과도 문자열로 반환한다.
    if (typeof obj.result === "number") return String(obj.result);
    if (typeof obj.result === "string") return obj.result;
    if (obj.text !== undefined) return String(obj.text ?? "");
    return "";
  }
  return String(v).trim();
}

// 수식 셀(공유수식 포함)은 exceljs의 `cell.value`가 아니라 `cell.result`에 계산 캐시값이
// 실린다(공유수식의 자식 셀은 `.value`에 결과가 안 실림 — 실제 파일로 확인). #DIV/0! 같은
// 오류 결과는 null로 처리한다.
function cellNum(cell: ExcelJS.Cell): number | null {
  const v = cell.value;
  if (typeof v === "number") return v;
  if (v && typeof v === "object") {
    const result = cell.result;
    return typeof result === "number" ? result : null;
  }
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function isBlankRow(texts: string[]): boolean {
  return texts.every((t) => t.trim() === "");
}

function parseSection(ws: ExcelJS.Worksheet, titleRow: number, stopTitle: string): MaterialInventorySection {
  function rowTexts(r: number): string[] {
    const row = ws.getRow(r);
    const out: string[] = [];
    for (let c = 1; c <= REMARK_SCAN_MAX_COL; c++) out.push(cellText(row.getCell(c)));
    return out;
  }

  const colMap = buildColumnMap(rowTexts(titleRow + 1), rowTexts(titleRow + 2));
  const dataStart = titleRow + 3;
  const maxScan = Math.min(ws.rowCount, dataStart + 400);

  const rows: MaterialInventoryRow[] = [];
  let totals: MaterialInventoryTotals | null = null;

  function get(row: ExcelJS.Row, field: MaterialInventoryFieldKey): string {
    const col = colMap[field];
    return col ? cellText(row.getCell(col)) : "";
  }
  function getNum(row: ExcelJS.Row, field: MaterialInventoryFieldKey): number | null {
    const col = colMap[field];
    return col ? cellNum(row.getCell(col)) : null;
  }
  // 비고 값이 원본에서 헤더 열(O)이 아니라 한 칸 옆(P)에 입력된 행이 섞여 있어(수기 작성
  // 오차로 보임), 매핑된 열부터 몇 칸 더 훑어서 비어있지 않은 값을 모두 모은다.
  function getRemark(row: ExcelJS.Row): string {
    const startCol = colMap.remark;
    if (!startCol) return "";
    const parts: string[] = [];
    for (let c = startCol; c <= REMARK_SCAN_MAX_COL; c++) {
      const v = cellText(row.getCell(c));
      if (v) parts.push(v);
    }
    return parts.join(" / ");
  }
  function readTotals(row: ExcelJS.Row): MaterialInventoryTotals {
    return {
      beginQty: getNum(row, "beginQty"),
      inSlipQty: getNum(row, "inSlipQty"),
      inActualQty: getNum(row, "inActualQty"),
      outSlipQty: getNum(row, "outSlipQty"),
      outActualQty: getNum(row, "outActualQty"),
      currentQty: getNum(row, "currentQty"),
      inCumQty: getNum(row, "inCumQty"),
      outCumQty: getNum(row, "outCumQty"),
    };
  }

  for (let r = dataStart; r <= maxScan; r++) {
    const texts = rowTexts(r);
    if (isBlankRow(texts)) {
      // 데이터 영역이 끝나는 빈 줄 바로 다음 행이 "합계" 행(SEQ/제품명은 비어 있지만 숫자
      // 값은 있는 행)이면 그것까지 챙기고 끝낸다 — 그 뒤(결재란 등)는 더 보지 않는다.
      const nextTexts = rowTexts(r + 1);
      if (!isBlankRow(nextTexts)) {
        const nextRow = ws.getRow(r + 1);
        if (!get(nextRow, "seq") && !get(nextRow, "name")) {
          const candidate = readTotals(nextRow);
          if (Object.values(candidate).some((v) => v !== null)) totals = candidate;
        }
      }
      break;
    }
    if (stopTitle && texts.some((t) => t.trim() === stopTitle)) break;

    const row = ws.getRow(r);
    const seq = get(row, "seq");
    const name = get(row, "name");
    if (!seq && !name) break; // 예상치 못한 형태(결재란 등) — 안전하게 종료

    rows.push({
      seq,
      name,
      stockUnit: get(row, "stockUnit"),
      beginQty: getNum(row, "beginQty"),
      weightUnit: get(row, "weightUnit"),
      inSlipQty: getNum(row, "inSlipQty"),
      inActualQty: getNum(row, "inActualQty"),
      outSlipQty: getNum(row, "outSlipQty"),
      outActualQty: getNum(row, "outActualQty"),
      yieldRate: getNum(row, "yieldRate"),
      currentQty: getNum(row, "currentQty"),
      inCumQty: getNum(row, "inCumQty"),
      outCumQty: getNum(row, "outCumQty"),
      remark: getRemark(row),
    });
  }

  return { rows, totals };
}

export async function parseProductionMaterialInventoryWorkbook(
  buffer: Buffer,
): Promise<ParsedProductionMaterialInventory> {
  const wb = new ExcelJS.Workbook();
  // exceljs 타입 선언 내부의 Buffer는 (전역이 아니라) 자체 정의한 `extends ArrayBuffer`
  // 타입이라 Node의 실제 Buffer와 구조적으로 맞지 않는다. 런타임에는 정상 동작.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  const empty: MaterialInventorySection = { rows: [], totals: null };
  if (!ws) return { snapshotDate: null, rawMaterials: empty, semiFinished: { ...empty } };

  function rowTexts(r: number): string[] {
    const row = ws.getRow(r);
    const out: string[] = [];
    for (let c = 1; c <= REMARK_SCAN_MAX_COL; c++) out.push(cellText(row.getCell(c)));
    return out;
  }

  let rawTitleRow = -1;
  let semiTitleRow = -1;
  for (let r = 1; r <= ws.rowCount; r++) {
    const texts = rowTexts(r);
    if (rawTitleRow === -1 && texts.some((t) => t.trim() === RAW_TITLE)) rawTitleRow = r;
    if (semiTitleRow === -1 && texts.some((t) => t.trim() === SEMI_TITLE)) semiTitleRow = r;
    if (rawTitleRow !== -1 && semiTitleRow !== -1) break;
  }

  let snapshotDate: string | null = null;
  for (const titleRow of [rawTitleRow, semiTitleRow]) {
    if (titleRow === -1 || snapshotDate) continue;
    for (const t of rowTexts(titleRow)) {
      const m = t.match(/(\d{4})\.(\d{2})\.(\d{2})/);
      if (m) {
        snapshotDate = `${m[1]}-${m[2]}-${m[3]}`;
        break;
      }
    }
  }

  const rawMaterials = rawTitleRow === -1 ? empty : parseSection(ws, rawTitleRow, SEMI_TITLE);
  const semiFinished = semiTitleRow === -1 ? empty : parseSection(ws, semiTitleRow, "");

  return { snapshotDate, rawMaterials, semiFinished };
}

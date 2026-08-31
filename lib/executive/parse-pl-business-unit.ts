import "server-only";
import ExcelJS from "exceljs";

// 회계팀이 실제 쓰는 부문별/업장별 손익 워크북을 그대로 읽는다. 두 가지 레이아웃을 지원한다:
//
// (A) 시트 하나 = 부문 하나 (예: "섬들채_1-8월_월별업장별_손익_수식.xlsx"의 "01_소금가게" 시트)
//     시트 이름이 "번호_부문명" 형식이면 그 시트 전체에서 첫 "구분" 헤더 행을 찾아 파싱한다.
//
// (B) 시트 하나에 부문별 블록이 여러 개 (예: "태평소금_1-8월_전년대비_손익_통합.xlsx"의
//     "③-1 제품매출 손익" / "③-2 상품매출 손익" 같은 섹션들)
//     시트 이름이 (A)에 해당하지 않으면, 시트 안에서 "구분"으로 시작하는 헤더 행을 전부 찾고,
//     각 헤더 바로 위 행의 텍스트(예: "③-1 제품매출 손익")에서 번호/기호와 "손익"을 떼어
//     부문명(예: "제품매출")을 추출한다.
//
// 두 레이아웃 모두 헤더 행 자체는 "구분 | 1월 | 2월 | ... | N월(추정) | 누계" 형식이고,
// 그 아래 값 행은 "매출/매출액", "매출원가", "판관비", "영업외수익", "영업외비용" 라벨을 쓴다
// (앞에 "Ⅰ." 같은 로마숫자, 뒤에 "(배분)"/"(파라미터)" 같은 꼬리표가 붙기도 해서 정규화 후 비교한다).
// 매출총이익/영업이익/세전이익은 계산값이라 읽지 않고 화면에서 다시 계산한다.
const KNOWN_SHEET_UNITS = ["소금가게", "쇼핑몰", "소금항카페", "힐링스파", "아이스크림", "힐링카라반"];

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
  return KNOWN_SHEET_UNITS.includes(withoutPrefix) ? withoutPrefix : null;
}

// "③-1 제품매출 손익" → "제품매출", "2. 소금가게 손익" → "소금가게" 처럼 앞의 기호/번호와
// 뒤의 "손익"을 떼어 부문명만 남긴다.
function extractBlockTitle(raw: string): string {
  return raw
    .replace(/^[^\p{L}]+/u, "") // 맨 앞 기호/숫자(③-1, 2., 01_ 등) 제거
    .replace(/\s*손익\s*$/, "")
    .trim();
}

const FIELD_LABELS: { pattern: RegExp; field: "revenue" | "cogs" | "sga" | "nonOpIncome" | "nonOpExpense" }[] = [
  { pattern: /^매출원가$/, field: "cogs" },
  { pattern: /^(매출|매출액)$/, field: "revenue" },
  { pattern: /^판관비$/, field: "sga" },
  { pattern: /^영업외수익$/, field: "nonOpIncome" },
  { pattern: /^영업외비용$/, field: "nonOpExpense" },
];

function normalizeLabel(raw: string): string {
  return raw
    .replace(/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\.\s*/, "") // "Ⅰ. " 같은 로마숫자 접두
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]-?\d*\.?\s*/, "") // "③-1 " 같은 원문자 접두 (혹시 라벨에도 붙는 경우 대비)
    .replace(/\([^)]*\)\s*$/, "") // "(배분)"/"(파라미터)" 같은 꼬리표
    .trim();
}

function matchField(label: string): "revenue" | "cogs" | "sga" | "nonOpIncome" | "nonOpExpense" | null {
  const normalized = normalizeLabel(label);
  for (const { pattern, field } of FIELD_LABELS) {
    if (pattern.test(normalized)) return field;
  }
  return null;
}

type ValueMap = Map<number, { revenue?: number | null; cogs?: number | null; sga?: number | null; nonOpIncome?: number | null; nonOpExpense?: number | null }>;

// headerRow부터 시작하는 "구분|1월|...|N월(추정)|누계" 표 하나를 읽어 부문 하나의 월별 행을 만든다.
// nextHeaderRow(있다면) 이전까지만 값 행을 읽어, 같은 시트의 다음 블록과 섞이지 않게 한다.
function parseBlock(
  ws: ExcelJS.Worksheet,
  headerRow: number,
  scanEndRow: number,
  businessUnit: string,
  year: number,
): { rows: ParsedBusinessUnitRow[]; error: string | null } {
  const header = ws.getRow(headerRow);
  // header.cellCount가 시트 전체 폭(최대 16384)을 반환하는 경우가 있어, 실제로 쓰는 범위로 제한한다.
  const maxCol = Math.min(header.cellCount + 1, 20);
  const monthColumns: { col: number; month: number }[] = [];
  for (let c = 2; c <= maxCol; c++) {
    const text = cellText(header.getCell(c));
    const m = text.match(/^(\d{1,2})월/);
    if (m) monthColumns.push({ col: c, month: Number(m[1]) });
  }
  if (monthColumns.length === 0) {
    return { rows: [], error: `"${businessUnit}" 구획: 월 컬럼("1월","2월"...)을 찾지 못했습니다.` };
  }

  const values: ValueMap = new Map();
  for (const { month } of monthColumns) values.set(month, {});

  for (let r = headerRow + 1; r <= scanEndRow; r++) {
    const label = cellText(ws.getRow(r).getCell(1));
    if (!label) continue;
    const field = matchField(label);
    if (!field) continue;

    for (const { col, month } of monthColumns) {
      values.get(month)![field] = cellNumber(ws.getRow(r).getCell(col));
    }
  }

  const rows = monthColumns.map(({ month }) => {
    const v = values.get(month)!;
    return {
      businessUnit,
      yearMonth: `${year}-${String(month).padStart(2, "0")}`,
      revenue: v.revenue ?? null,
      cogs: v.cogs ?? null,
      sga: v.sga ?? null,
      nonOperatingIncome: v.nonOpIncome ?? null,
      nonOperatingExpense: v.nonOpExpense ?? null,
    };
  });

  return { rows, error: null };
}

export async function parsePlBusinessUnitWorkbook(buffer: Buffer, year: number): Promise<ParseBusinessUnitResult> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs의 Buffer 타입과 @types/node 버전이 어긋나 있음 (기존 parse-production.ts와 동일한 처리)
  await wb.xlsx.load(buffer as any);

  const rows: ParsedBusinessUnitRow[] = [];
  const errors: string[] = [];
  let matchedAnyBlock = false;

  wb.eachSheet((ws) => {
    const sheetUnit = sheetUnitName(ws.name);

    if (sheetUnit) {
      // (A) 시트 하나 = 부문 하나
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
      matchedAnyBlock = true;
      const result = parseBlock(ws, headerRow, ws.rowCount, sheetUnit, year);
      if (result.error) errors.push(result.error);
      rows.push(...result.rows);
      return;
    }

    // (B) 한 시트 안에 "구분" 헤더가 여러 번 나오는 구조
    const headerRows: number[] = [];
    for (let r = 1; r <= ws.rowCount; r++) {
      if (cellText(ws.getRow(r).getCell(1)) === "구분") headerRows.push(r);
    }
    if (headerRows.length === 0) return; // 이 시트는 대상 아님 (요약/파라미터 시트 등)

    for (let i = 0; i < headerRows.length; i++) {
      const headerRow = headerRows[i];
      const titleRaw = cellText(ws.getRow(headerRow - 1).getCell(1));
      const businessUnit = extractBlockTitle(titleRaw);
      // "④ 부문 합산 = 전체 손익", "⑤ ... 대조", "⑦ ... 합계"처럼 개별 부문이 아니라
      // 부문을 합친 총계/비교 섹션은 건너뛴다 (안 그러면 전체 합계가 부문 중 하나로 잘못 들어가
      // 나중에 부문별 합계를 낼 때 이중 집계된다). 실제 부문명(제품매출/소금가게 등)에는
      // 이런 단어가 들어갈 일이 없다는 전제.
      if (/합산|합계|대조|전체|누계 비교/.test(businessUnit)) continue;
      if (!businessUnit) {
        errors.push(`"${ws.name}" 시트 ${headerRow}행: 바로 위 줄에서 부문명을 찾지 못했습니다 ("${titleRaw}").`);
        continue;
      }
      matchedAnyBlock = true;
      const scanEndRow = i + 1 < headerRows.length ? headerRows[i + 1] - 2 : ws.rowCount;
      const result = parseBlock(ws, headerRow, scanEndRow, businessUnit, year);
      if (result.error) errors.push(result.error);
      rows.push(...result.rows);
    }
  });

  if (!matchedAnyBlock) {
    return {
      ok: false,
      errors: [
        `부문별 손익 표를 찾지 못했습니다. 시트 이름이 "01_소금가게"처럼 번호_부문명 형식이거나, 시트 안에 "구분|1월|2월|..." 헤더가 있는 표가 있어야 합니다.`,
      ],
    };
  }
  if (errors.length > 0) return { ok: false, errors };
  if (rows.length === 0) return { ok: false, errors: ["값이 채워진 행을 찾지 못했습니다."] };
  return { ok: true, rows };
}

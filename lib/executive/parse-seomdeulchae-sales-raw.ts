import "server-only";
import * as XLSX from "xlsx";

// 섬들채 POS의 "일자별 (상품별)" 내보내기(.xls/.xlsx 둘 다 지원 — 레거시 .xls는 exceljs가
// 못 읽어서 xlsx(SheetJS)를 쓴다)를 그대로 저장할 수 있는 형태로 변환한다. "대분류" 값이
// 지금까지 써온 업장명과 이름이 달라(온라인쇼핑몰/아이스크림가게/힐링스파/소금박물관/
// 천일염힐링캠프/함초식당), 사용자 확인을 거쳐 표준 업장명 + 법인코드로 매핑한다.
const UNIT_ALIAS: Record<string, { corpCode: string; businessUnit: string }> = {
  온라인쇼핑몰: { corpCode: "0360", businessUnit: "택배/쇼핑몰" },
  소금가게: { corpCode: "0360", businessUnit: "소금가게" },
  아이스크림가게: { corpCode: "0360", businessUnit: "소금아이스크림" },
  힐링스파: { corpCode: "0360", businessUnit: "해양힐링센터" },
  소금박물관: { corpCode: "0440", businessUnit: "박물관" },
  천일염힐링캠프: { corpCode: "0360", businessUnit: "카라반" },
  함초식당: { corpCode: "0360", businessUnit: "소금항카페" },
};

export type RawSalesRow = {
  saleDate: string; // YYYY-MM-DD
  corpCode: string;
  businessUnit: string;
  productCode: string;
  productName: string | null;
  qty: number | null;
  grossAmount: number | null;
  discountAmount: number | null;
  netAmount: number;
};

export type ParseSalesRawResult = { ok: true; rows: RawSalesRow[] } | { ok: false; errors: string[] };

function toDateString(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, ""));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function parseSeomdeulchaeSalesRawWorkbook(buffer: Buffer): ParseSalesRawResult {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { ok: false, errors: ["시트를 찾을 수 없습니다."] };

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });

  // 헤더 행("일자","대분류",...)을 라벨로 찾는다 — 고정 행 번호에 기대지 않는다.
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(aoa.length, 20); i++) {
    const row = aoa[i];
    if (Array.isArray(row) && row[0] === "일자" && row[1] === "대분류") {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) {
    return { ok: false, errors: ['헤더 행("일자","대분류","상품코드",...)을 찾지 못했습니다.'] };
  }

  const errors: string[] = [];
  const rows: RawSalesRow[] = [];
  const unknownUnits = new Set<string>();

  for (let i = headerRowIdx + 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!Array.isArray(r) || r.every((v) => v === null || v === undefined || v === "")) continue;

    const [dateRaw, unitRaw, productCode, productName, qty, gross, discount, net] = r;
    const rowNum = i + 1;

    // 표 맨 끝에 "합계" 같은 요약 행이 붙어 나오는 파일이 있다(데이터 행이 아님) — 조용히 건너뛴다.
    if (String(dateRaw ?? "").trim() === "합계") continue;

    const saleDate = toDateString(dateRaw);
    if (!saleDate) {
      errors.push(`${rowNum}행: 일자 형식을 읽지 못했습니다 (${String(dateRaw)}).`);
      continue;
    }

    const unitLabel = String(unitRaw ?? "").trim();
    const mapped = UNIT_ALIAS[unitLabel];
    if (!mapped) {
      unknownUnits.add(unitLabel);
      continue;
    }

    const netAmount = toNumber(net);
    if (netAmount === null) {
      errors.push(`${rowNum}행: 실매출액이 숫자가 아닙니다 (${String(net)}).`);
      continue;
    }

    rows.push({
      saleDate,
      corpCode: mapped.corpCode,
      businessUnit: mapped.businessUnit,
      productCode: String(productCode ?? "").trim(),
      productName: productName ? String(productName).trim() : null,
      qty: toNumber(qty),
      grossAmount: toNumber(gross),
      discountAmount: toNumber(discount),
      netAmount,
    });
  }

  if (unknownUnits.size > 0) {
    errors.push(`알 수 없는 대분류가 있습니다: ${[...unknownUnits].join(", ")}`);
  }
  if (errors.length > 0) return { ok: false, errors };
  if (rows.length === 0) return { ok: false, errors: ["값이 채워진 행을 찾지 못했습니다."] };
  return { ok: true, rows };
}

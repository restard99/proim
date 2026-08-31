import "server-only";
import ExcelJS from "exceljs";
import { EXECUTIVE_CORPS } from "@/lib/yerp/executive-corps";

const HEADER_ROW = 1;
const DATA_START_ROW = 2;
const CORP_NAME_TO_CODE = new Map<string, string>(EXECUTIVE_CORPS.map((c) => [c.corpName, c.corpCode]));
const PRODUCTION_CATEGORIES = new Set(["천일염", "가공염"]);

export type ParsedTargetRow = {
  metric: "sales" | "production";
  corpCode: string | null;
  category: string | null;
  periodType: "week" | "month";
  periodKey: string;
  targetValue: number;
};

export type ParseTargetsResult =
  | { ok: true; rows: ParsedTargetRow[] }
  | { ok: false; errors: string[] };

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (typeof v === "string") return v.trim();
  if (v instanceof Date) return v.toISOString().slice(0, 10);
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

// 기간 셀은 주간이면 "YYYY-MM-DD"(그 주 월요일), 월간이면 "YYYY-MM" 형식이어야 한다.
function normalizePeriodKey(periodType: "week" | "month", raw: string): string | null {
  if (periodType === "week") {
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  }
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{4})-(\d{2})-\d{2}$/);
  return m ? `${m[1]}-${m[2]}` : null;
}

export async function parseExecutiveTargetsWorkbook(buffer: Buffer): Promise<ParseTargetsResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  if (!ws) return { ok: false, errors: ["시트를 찾을 수 없습니다."] };

  const rows: ParsedTargetRow[] = [];
  const errors: string[] = [];

  for (let r = DATA_START_ROW; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const metricLabel = cellText(row.getCell(1));
    if (!metricLabel) continue; // 빈 행은 건너뜀

    const groupLabel = cellText(row.getCell(2));
    const periodTypeLabel = cellText(row.getCell(3));
    const periodRaw = cellText(row.getCell(4));
    const targetValue = cellNumber(row.getCell(5));

    if (metricLabel !== "매출" && metricLabel !== "생산") {
      errors.push(`${r}행: 구분은 "매출" 또는 "생산"이어야 합니다 (입력값: "${metricLabel}")`);
      continue;
    }
    if (periodTypeLabel !== "주간" && periodTypeLabel !== "월간") {
      errors.push(`${r}행: 기간유형은 "주간" 또는 "월간"이어야 합니다 (입력값: "${periodTypeLabel}")`);
      continue;
    }
    const periodType = periodTypeLabel === "주간" ? "week" : "month";
    const periodKey = normalizePeriodKey(periodType, periodRaw);
    if (!periodKey) {
      errors.push(
        `${r}행: 기간 형식이 올바르지 않습니다 (주간=YYYY-MM-DD, 월간=YYYY-MM, 입력값: "${periodRaw}")`,
      );
      continue;
    }
    if (targetValue === null) {
      errors.push(`${r}행: 목표값이 숫자가 아닙니다 (입력값: "${cellText(row.getCell(5))}")`);
      continue;
    }

    if (metricLabel === "매출") {
      const corpCode = CORP_NAME_TO_CODE.get(groupLabel);
      if (!corpCode) {
        errors.push(`${r}행: 법인명 "${groupLabel}"을 찾을 수 없습니다 (태평소금/태평염전/섬들채/박물관 중 하나여야 함)`);
        continue;
      }
      rows.push({ metric: "sales", corpCode, category: null, periodType, periodKey, targetValue });
    } else {
      if (!PRODUCTION_CATEGORIES.has(groupLabel)) {
        errors.push(`${r}행: 생산 카테고리는 "천일염" 또는 "가공염"이어야 합니다 (입력값: "${groupLabel}")`);
        continue;
      }
      rows.push({ metric: "production", corpCode: null, category: groupLabel, periodType, periodKey, targetValue });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  if (rows.length === 0) return { ok: false, errors: ["값이 채워진 행을 찾지 못했습니다."] };
  return { ok: true, rows };
}

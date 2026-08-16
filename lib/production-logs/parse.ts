import "server-only";
import ExcelJS from "exceljs";

export type ProductionLogSheet = {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
};

const HEADER_ROW = 3;
const DATA_START_ROW = 4;
// 실제 파일 탭들의 컬럼 수(33~50개)보다 여유있게 잡아, 매달 컬럼이 조금 늘어나도 안전하게 커버한다.
const MAX_COL = 60;

function numText(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

// 시작/종료시간처럼 "시간만" 의미 있는 컬럼이 Excel 날짜 기준일(1899-12-30/31)로
// 잘못 해석되어 셀에 저장된 경우가 섞여 있어, 날짜부는 버리고 시:분만 남긴다.
function isTimeOnlyDate(d: Date): boolean {
  return d.getFullYear() === 1899 && d.getMonth() === 11 && (d.getDate() === 30 || d.getDate() === 31);
}
function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatDateValue(d: Date): string {
  return isTimeOnlyDate(d) ? formatTime(d) : d.toLocaleDateString("ko-KR");
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return formatDateValue(v);
  if (typeof v === "number") return numText(v);
  if (typeof v === "object") {
    const obj = v as { richText?: { text: string }[]; result?: unknown; text?: unknown };
    if (obj.richText) return obj.richText.map((t) => t.text).join("");
    if (obj.result !== undefined) {
      if (obj.result instanceof Date) return formatDateValue(obj.result);
      return typeof obj.result === "number" ? numText(obj.result) : String(obj.result ?? "");
    }
    if (obj.text !== undefined) return String(obj.text ?? "");
    return "";
  }
  return String(v).trim();
}

function isBlankTexts(texts: string[]): boolean {
  return texts.every((t) => t.trim() === "");
}

// 시트마다 컬럼 구성이 서로 다르고 매달 조금씩 바뀔 수 있어, 특정 컬럼을 고정 타입으로
// 다루지 않고 3번째 행(헤더)을 그대로 신뢰해 4번째 행부터를 데이터로 인식한다.
export async function parseProductionLogWorkbook(buffer: Buffer): Promise<ProductionLogSheet[]> {
  const wb = new ExcelJS.Workbook();
  // exceljs 타입 선언 내부의 Buffer는 (전역이 아니라) 자체 정의한 `extends ArrayBuffer`
  // 타입이라 Node의 실제 Buffer와 구조적으로 맞지 않는다. 런타임에는 정상 동작.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any);

  const sheets: ProductionLogSheet[] = [];

  for (const ws of wb.worksheets) {
    const headerRow = ws.getRow(HEADER_ROW);
    const rawHeaders: string[] = [];
    for (let c = 1; c <= MAX_COL; c++) rawHeaders.push(cellText(headerRow.getCell(c)));

    let lastCol = 0;
    for (let i = rawHeaders.length - 1; i >= 0; i--) {
      if (rawHeaders[i] !== "") {
        lastCol = i + 1;
        break;
      }
    }
    if (lastCol === 0) {
      sheets.push({ name: ws.name, headers: [], rows: [] });
      continue;
    }

    // 같은 이름의 헤더가 중복되면(예: 병합된 상위 헤더 아래 반복 컬럼) 뒤에 번호를 붙여 구분한다.
    const seen = new Map<string, number>();
    const headers = rawHeaders.slice(0, lastCol).map((h, i) => {
      const label = h || `열${i + 1}`;
      const count = seen.get(label) ?? 0;
      seen.set(label, count + 1);
      return count === 0 ? label : `${label}(${count + 1})`;
    });

    const rows: Record<string, string>[] = [];
    for (let r = DATA_START_ROW; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const texts: string[] = [];
      for (let c = 1; c <= lastCol; c++) texts.push(cellText(row.getCell(c)));
      if (isBlankTexts(texts)) continue;
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = texts[i] ?? "";
      });
      rows.push(record);
    }

    sheets.push({ name: ws.name, headers, rows });
  }

  return sheets;
}

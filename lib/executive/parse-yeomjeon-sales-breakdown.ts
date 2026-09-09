import "server-only";
import ExcelJS from "exceljs";

// "주간_월간_업무보고" 워크북의 "매출-태평염전2" 탭에서 PPT 주간업무보고 "■ 판매처별 실적"
// 표(채널별 수량/금액/단가)를 그대로 옮긴다. 이 시트는 531행부터 시작하는 표만 유효하다
// (그 앞쪽 1~530행에는 옛날/다른 용도 데이터가 같은 모양으로 반복돼 있어 헷갈리기 쉽지만
// 실제 사용하는 건 531행 이후뿐 — 사용자 확인).
//
// 531행 이후 구조: "n월"이라는 이름의 표가 달마다 하나씩(01월, 02월, ...) 이어지다가, 맨
// 마지막에 "MM.DD-MM.DD" 형식의 날짜 범위 이름을 가진 표가 하나 더 있다(예: "08.31-09.06").
// 실측 결과 이 둘이 PPT의 "주간"/"월간" 두 열에 각각 대응한다 — 날짜범위 표가 "주간"(이번
// 주 실적), 마지막 "n월" 표가 "월간"(그 달의 최근 마감 실적)이다. 각 표는 채널(도매/관내,
// 기타/태평소금/서비스사업부/합계) × 상품유형(천일염 연산/토판염 연산/간수/양파/함초 등)
// × [수량/금액/단가] 매트릭스인데, 실제로 활성화된(값이 있는) 상품유형은 한두 개뿐이라
// 화면에는 채널별 합계만 보여준다.
//
// 단가는 살짝 특이하다: 표의 "합계"(총계) 열 자체의 단가(금액÷수량으로 정확히 계산된 값)와,
// 실제 활성화된 개별 상품유형 열에 별도로 적혀 있는 단가가 다를 수 있다(실측 결과 원본
// 워크북 자체가 그렇게 되어 있고, PPT도 개별 상품유형 열의 단가를 그대로 쓴다). 그래서
// 개별 상품유형 열에 단가가 있으면 그 값을 우선하고, 없을 때만 합계 열의 단가로 대체한다.

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const obj = v as { richText?: { text: string }[]; result?: unknown };
    if (obj.richText) return obj.richText.map((t) => t.text).join("").trim();
    if (typeof obj.result === "string") return obj.result.trim();
    if (typeof obj.result === "number") return String(obj.result);
    return "";
  }
  return String(v).trim();
}

function cellNum(cell: ExcelJS.Cell): number | null {
  const v = cell.value;
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const r = (v as { result?: unknown }).result;
    if (typeof r === "number") return r;
    return null;
  }
  return null;
}

type ChannelTotals = { channel: string; qty: number | null; amount: number | null; unitPrice: number | null };

const CHANNEL_OFFSETS = [
  { channel: "도매", offset: 2 },
  { channel: "관내,기타", offset: 5 },
  { channel: "태평소금", offset: 8 },
  { channel: "서비스사업부", offset: 11 },
] as const;

// 블록의 헤더 행(그룹 행)에서 "합계" 라벨이 있는 열을 찾는다 — 그 표의 상품유형 열 중 가장
// 오른쪽(총계) 열이다.
function findTotalCol(ws: ExcelJS.Worksheet, groupRow: number): number {
  for (let c = 5; c <= 31; c++) {
    if (cellText(ws.getRow(groupRow).getCell(c)) === "합계") return c;
  }
  return -1;
}

function readChannelTotals(ws: ExcelJS.Worksheet, blockStart: number): ChannelTotals[] {
  const totalCol = findTotalCol(ws, blockStart);
  if (totalCol === -1) return [];

  const rows: ChannelTotals[] = CHANNEL_OFFSETS.map(({ channel, offset }) => {
    const base = blockStart + offset;
    const qty = cellNum(ws.getRow(base).getCell(totalCol));
    const amount = cellNum(ws.getRow(base + 1).getCell(totalCol));
    // 단가: 활성화된 개별 상품유형 열(합계 열 왼쪽)에 값이 있으면 그걸 우선한다.
    let unitPrice: number | null = null;
    for (let c = 5; c < totalCol; c++) {
      const up = cellNum(ws.getRow(base + 2).getCell(c));
      if (up !== null) {
        unitPrice = up;
        break;
      }
    }
    if (unitPrice === null) unitPrice = cellNum(ws.getRow(base + 2).getCell(totalCol));
    return { channel, qty, amount, unitPrice };
  });

  rows.push({
    channel: "합계",
    qty: cellNum(ws.getRow(blockStart + 14).getCell(totalCol)),
    amount: cellNum(ws.getRow(blockStart + 15).getCell(totalCol)),
    unitPrice: null,
  });

  return rows;
}

export type YeomjeonChannelSales = {
  channel: string; // "도매" | "관내,기타" | "태평소금" | "서비스사업부" | "합계"
  weekQty: number | null;
  weekAmount: number | null;
  weekUnitPrice: number | null;
  monthQty: number | null;
  monthAmount: number | null;
  monthUnitPrice: number | null;
};

export type YeomjeonSalesBreakdownSnapshot = {
  weekLabel: string | null; // 예: "08.31-09.06"
  monthLabel: string | null; // 예: "09월"
  rows: YeomjeonChannelSales[];
};

export type ParseYeomjeonSalesBreakdownResult =
  | { ok: true; snapshot: YeomjeonSalesBreakdownSnapshot }
  | { ok: false; errors: string[] };

export async function parseYeomjeonSalesBreakdownWorkbook(buffer: Buffer): Promise<ParseYeomjeonSalesBreakdownResult> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs Buffer 타입과 @types/node 버전이 어긋나 있음(기존 파서들과 동일한 처리)
  await wb.xlsx.load(buffer as any);

  const ws = wb.getWorksheet("매출-태평염전2");
  if (!ws) return { ok: false, errors: ['"매출-태평염전2" 시트를 찾을 수 없습니다.'] };

  let monthBlock: { row: number; label: string } | null = null;
  let weekBlock: { row: number; label: string } | null = null;
  for (let r = 531; r <= ws.rowCount; r++) {
    const t = cellText(ws.getRow(r).getCell(2));
    if (/^\d{1,2}월$/.test(t)) monthBlock = { row: r, label: t }; // 마지막 것이 남도록 계속 덮어씀
    else if (/^\d{2}\.\d{2}-\d{2}\.\d{2}$/.test(t)) weekBlock = { row: r, label: t };
  }

  if (!monthBlock && !weekBlock) {
    return { ok: false, errors: ['"매출-태평염전2" 시트에서 판매처별 실적 표를 찾지 못했습니다.'] };
  }

  const weekTotals = weekBlock ? readChannelTotals(ws, weekBlock.row) : [];
  const monthTotals = monthBlock ? readChannelTotals(ws, monthBlock.row) : [];

  const channelNames = ["도매", "관내,기타", "태평소금", "서비스사업부", "합계"];
  const rows: YeomjeonChannelSales[] = channelNames.map((channel) => {
    const w = weekTotals.find((r) => r.channel === channel);
    const m = monthTotals.find((r) => r.channel === channel);
    return {
      channel,
      weekQty: w?.qty ?? null,
      weekAmount: w?.amount ?? null,
      weekUnitPrice: w?.unitPrice ?? null,
      monthQty: m?.qty ?? null,
      monthAmount: m?.amount ?? null,
      monthUnitPrice: m?.unitPrice ?? null,
    };
  });

  return {
    ok: true,
    snapshot: {
      weekLabel: weekBlock?.label ?? null,
      monthLabel: monthBlock?.label ?? null,
      rows,
    },
  };
}

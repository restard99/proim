"use server";

import ExcelJS from "exceljs";
import { getSalesByCustomer, getSalesTotal, getProductSalesByCustomers, type CustomerSales } from "@/lib/yerp/sales";
import { groupCustomerSales, type GroupedCustomerSales } from "@/lib/yerp/customer-sort";

export type SalesPeriodData = {
  rows: CustomerSales[];
  total: number;
  customerCount: number;
  compareTotal: number | null;
};

export async function getSalesPeriodData(input: {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  search?: string;
}): Promise<SalesPeriodData> {
  const [rows, totals, compareTotals] = await Promise.all([
    getSalesByCustomer({ startDate: input.startDate, endDate: input.endDate, search: input.search }),
    getSalesTotal({ startDate: input.startDate, endDate: input.endDate }),
    input.compareStartDate && input.compareEndDate
      ? getSalesTotal({ startDate: input.compareStartDate, endDate: input.compareEndDate })
      : Promise.resolve(null),
  ]);

  return {
    rows,
    total: totals.total,
    customerCount: totals.customerCount,
    compareTotal: compareTotals?.total ?? null,
  };
}

// 월간/월누적 조회에서 행(거래처 또는 그룹)을 펼쳤을 때, 그 안에 속한 업체별로 납품한
// 제품명/수량/금액을 보여준다. customerCode별로 묶어서 반환한다.
export async function getProductSalesDetail(input: {
  startDate: string;
  endDate: string;
  customerCodes: string[];
}): Promise<Record<string, { itemCode: string; itemName: string; qty: number; amount: number }[]>> {
  const rows = await getProductSalesByCustomers({
    startDate: input.startDate,
    endDate: input.endDate,
    customerCodes: input.customerCodes,
  });

  const byCustomer: Record<string, { itemCode: string; itemName: string; qty: number; amount: number }[]> = {};
  for (const r of rows) {
    if (!byCustomer[r.customerCode]) byCustomer[r.customerCode] = [];
    byCustomer[r.customerCode].push({ itemCode: r.itemCode, itemName: r.itemName, qty: r.qty, amount: r.amount });
  }
  return byCustomer;
}

export type ExportResult = { ok: true; base64: string; fileName: string } | { ok: false; message: string };

function formatDateDot(ymd: string) {
  if (ymd.length !== 8) return ymd;
  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

// 그룹(이마트/롯데 등)이면 속한 지점들, 개별 거래처면 자기 자신 하나를 "업체" 목록으로 본다
// (화면의 제품 펼치기와 동일한 단위 — SalesByCustomerView.tsx의 companies 참고).
function companiesOf(row: GroupedCustomerSales) {
  return row.isGroup
    ? row.details
    : [{ customerCode: row.key, customerName: row.displayName, amount: row.amount, lastTradeDate: row.lastTradeDate }];
}

export async function exportSalesExcel(input: {
  period: "weekly" | "monthly" | "mtd";
  periodLabel: string;
  startDate: string;
  endDate: string;
  search?: string;
}): Promise<ExportResult> {
  const rows = await getSalesByCustomer({ startDate: input.startDate, endDate: input.endDate, search: input.search });
  const groupedRows = groupCustomerSales(rows);
  if (groupedRows.length === 0) {
    return { ok: false, message: "내보낼 데이터가 없습니다." };
  }

  const showProductDrilldown = input.period === "monthly" || input.period === "mtd";
  let productsByCustomer: Record<string, { itemCode: string; itemName: string; qty: number; amount: number }[]> = {};
  if (showProductDrilldown) {
    const customerCodes = groupedRows.flatMap((row) => companiesOf(row).map((c) => c.customerCode));
    productsByCustomer = await getProductSalesDetail({
      startDate: input.startDate,
      endDate: input.endDate,
      customerCodes,
    });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`거래처별매출 ${input.periodLabel}`);

  ws.addRow([`거래처별 매출 - ${input.periodLabel} (${formatDateDot(input.startDate)} ~ ${formatDateDot(input.endDate)})`]);
  ws.addRow([]);
  ws.addRow(["거래처", "매출액", "최근거래일"]);
  for (const row of groupedRows) {
    ws.addRow([row.displayName, row.amount, row.lastTradeDate ?? ""]);
  }

  ws.addRow([]);
  if (!showProductDrilldown) {
    // 그룹 구분행은 이름만(금액/최근거래일 없음), 지점별 행은 요약표와 같은 3개 컬럼(이름/금액/
    // 최근거래일)을 그대로 채운다 — 헤더 컬럼 의미가 모든 데이터행에서 동일하게 유지되게 한다.
    ws.addRow(["거래처 / 지점", "매출액", "최근거래일"]);
    for (const row of groupedRows) {
      if (!row.isGroup) {
        ws.addRow([row.displayName, row.amount, row.lastTradeDate ?? ""]);
        continue;
      }
      ws.addRow([row.displayName]);
      for (const detail of row.details) {
        ws.addRow([detail.customerName, detail.amount, detail.lastTradeDate ?? ""]);
      }
    }
  } else {
    // 업체 행은 이름/금액(수량 칸 비움), 제품 행은 이름/수량/금액을 같은 3개 컬럼에 채운다.
    ws.addRow(["거래처 / 업체 / 제품명", "수량", "금액"]);
    for (const row of groupedRows) {
      ws.addRow([row.displayName]);
      for (const company of companiesOf(row)) {
        ws.addRow([company.customerName, "", company.amount]);
        const products = productsByCustomer[company.customerCode] ?? [];
        if (products.length === 0) {
          ws.addRow(["제품 내역이 없습니다."]);
        } else {
          for (const p of products) {
            ws.addRow([p.itemName, p.qty, p.amount]);
          }
        }
      }
    }
  }

  ws.getRow(1).font = { bold: true, size: 13 };
  ws.getRow(3).font = { bold: true };
  ws.getRow(4 + groupedRows.length + 1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 20));

  const buffer = await wb.xlsx.writeBuffer();
  return {
    ok: true,
    base64: Buffer.from(buffer).toString("base64"),
    fileName: `거래처별매출_${input.periodLabel}_${input.startDate}_${input.endDate}.xlsx`,
  };
}

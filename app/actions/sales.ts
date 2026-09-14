"use server";

import { getSalesByCustomer, getSalesTotal, getProductSalesByCustomers, type CustomerSales } from "@/lib/yerp/sales";

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

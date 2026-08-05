"use server";

import { getSalesByCustomer, getSalesTotal, type CustomerSales } from "@/lib/yerp/sales";

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

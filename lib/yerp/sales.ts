import "server-only";
import { yerpQuery } from "./client";

const CORP_CODE = "0460";

export type CustomerSales = {
  customerCode: string;
  customerName: string;
  amount: number;
  lastTradeDate: string | null;
};

export async function getSalesByCustomer(params: {
  startDate: string;
  endDate: string;
  search?: string;
}): Promise<CustomerSales[]> {
  const searchClause = params.search ? "AND c.CUST_NM LIKE @search" : "";

  const rows = await yerpQuery<{
    CUST_CD: string;
    CUST_NM: string | null;
    AMOUNT: number | null;
    LAST_DT: string | null;
  }>(
    `
    SELECT m.CUST_CD, c.CUST_NM, SUM(m.SALES_AMT_SUM) AS AMOUNT, MAX(m.SALES_DT) AS LAST_DT
    FROM SHUSER.PM_SALES_MGMT m
    LEFT JOIN SHUSER.SH_CUST_T c ON c.CORP_CODE = m.CORP_CODE AND c.CUST_CD = m.CUST_CD
    WHERE m.CORP_CODE = @corpCode
      AND m.SALES_DT BETWEEN @startDate AND @endDate
      ${searchClause}
    GROUP BY m.CUST_CD, c.CUST_NM
    ORDER BY AMOUNT DESC
    `,
    {
      corpCode: CORP_CODE,
      startDate: params.startDate,
      endDate: params.endDate,
      ...(params.search ? { search: `%${params.search}%` } : {}),
    },
  );

  return rows.map((r) => ({
    customerCode: r.CUST_CD,
    customerName: r.CUST_NM ?? r.CUST_CD,
    amount: Number(r.AMOUNT ?? 0),
    lastTradeDate: r.LAST_DT,
  }));
}

export async function getSalesTotal(params: {
  startDate: string;
  endDate: string;
}): Promise<{ total: number; customerCount: number }> {
  const rows = await yerpQuery<{ TOTAL: number | null; CUST_COUNT: number }>(
    `
    SELECT SUM(m.SALES_AMT_SUM) AS TOTAL, COUNT(DISTINCT m.CUST_CD) AS CUST_COUNT
    FROM SHUSER.PM_SALES_MGMT m
    WHERE m.CORP_CODE = @corpCode
      AND m.SALES_DT BETWEEN @startDate AND @endDate
    `,
    { corpCode: CORP_CODE, startDate: params.startDate, endDate: params.endDate },
  );

  return { total: Number(rows[0]?.TOTAL ?? 0), customerCount: Number(rows[0]?.CUST_COUNT ?? 0) };
}

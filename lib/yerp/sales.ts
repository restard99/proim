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
    SELECT s.CUST_CD, c.CUST_NM, SUM(s.SPLY_PRC + s.VAT) AS AMOUNT, MAX(s.SLIP_DT) AS LAST_DT
    FROM SHUSER.AC_PURC_SALE_T s
    LEFT JOIN SHUSER.SH_CUST_T c ON c.CORP_CODE = s.CORP_CODE AND c.CUST_CD = s.CUST_CD
    WHERE s.CORP_CODE = @corpCode
      AND s.PURC_SALE_SEC = '1'
      AND s.SLIP_DT BETWEEN @startDate AND @endDate
      ${searchClause}
    GROUP BY s.CUST_CD, c.CUST_NM
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
    SELECT SUM(s.SPLY_PRC + s.VAT) AS TOTAL, COUNT(DISTINCT s.CUST_CD) AS CUST_COUNT
    FROM SHUSER.AC_PURC_SALE_T s
    WHERE s.CORP_CODE = @corpCode
      AND s.PURC_SALE_SEC = '1'
      AND s.SLIP_DT BETWEEN @startDate AND @endDate
    `,
    { corpCode: CORP_CODE, startDate: params.startDate, endDate: params.endDate },
  );

  return { total: Number(rows[0]?.TOTAL ?? 0), customerCount: Number(rows[0]?.CUST_COUNT ?? 0) };
}

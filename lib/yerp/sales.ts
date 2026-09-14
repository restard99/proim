import "server-only";
import { yerpQuery } from "./client";
import { sortByPriorityCustomer } from "./customer-sort";

const CORP_CODE = "0460";

// PM_SALES_MGMT.SALES_AMT_SUM은 부가세 포함 금액(SALES_AMT+SALES_VAT, 과세 거래만 — 면세
// 거래는 SALES_VAT가 NULL이라 SALES_AMT_SUM=SALES_AMT와 같음)이라, "공급가만 표기" 요청에
// 따라 SALES_AMT(공급가액)만 합산한다(사용자 확인 — 실측으로 SALES_AMT_SUM이 정확히
// 공급가+부가세와 일치함을 확인함).

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
    SELECT m.CUST_CD, c.CUST_NM, SUM(m.SALES_AMT) AS AMOUNT, MAX(m.SALES_DT) AS LAST_DT
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

  return sortByPriorityCustomer(
    rows.map((r) => ({
      customerCode: r.CUST_CD,
      customerName: r.CUST_NM ?? r.CUST_CD,
      amount: Number(r.AMOUNT ?? 0),
      lastTradeDate: r.LAST_DT,
    })),
    (a, b) => b.amount - a.amount,
  );
}

export async function getSalesTotal(params: {
  startDate: string;
  endDate: string;
}): Promise<{ total: number; customerCount: number }> {
  const rows = await yerpQuery<{ TOTAL: number | null; CUST_COUNT: number }>(
    `
    SELECT SUM(m.SALES_AMT) AS TOTAL, COUNT(DISTINCT m.CUST_CD) AS CUST_COUNT
    FROM SHUSER.PM_SALES_MGMT m
    WHERE m.CORP_CODE = @corpCode
      AND m.SALES_DT BETWEEN @startDate AND @endDate
    `,
    { corpCode: CORP_CODE, startDate: params.startDate, endDate: params.endDate },
  );

  return { total: Number(rows[0]?.TOTAL ?? 0), customerCount: Number(rows[0]?.CUST_COUNT ?? 0) };
}

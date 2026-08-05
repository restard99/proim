import "server-only";
import { yerpQuery } from "./client";

const CORP_CODE = "0460";
// 회계 담당자가 수금 전용 화면 대신 일반전표에 직접 분개하는 관행이라,
// 매출채권 계정(외상매출금 0108, 받을어음 0110)의 전표 대변을 수금으로 간주한다.
const AR_ACCOUNT_PREFIXES = ["0108", "0110"];

function arAccountClause(alias: string) {
  return `(${AR_ACCOUNT_PREFIXES.map((_, i) => `${alias}.ACC_SBJ_CD LIKE @arPrefix${i}`).join(" OR ")})`;
}
function arAccountParams() {
  return Object.fromEntries(AR_ACCOUNT_PREFIXES.map((p, i) => [`arPrefix${i}`, `${p}%`]));
}

export type CustomerCollection = {
  customerCode: string;
  customerName: string;
  periodReceipt: number;
  balance: number;
};

export async function getCollectionsByCustomer(params: {
  startDate: string;
  endDate: string;
  search?: string;
}): Promise<CustomerCollection[]> {
  const searchClause = params.search ? "AND g.CUST_NM LIKE @search" : "";
  const searchParams = params.search ? { search: `%${params.search}%` } : {};

  const [periodRows, balanceRows] = await Promise.all([
    yerpQuery<{ CUST_CD: string | null; CUST_NM: string | null; RECEIPT: number | null }>(
      `
      SELECT g.CUST_CD, MAX(g.CUST_NM) AS CUST_NM, SUM(g.AMT) AS RECEIPT
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode
        AND ${arAccountClause("g")}
        AND g.DEB_CRD = '4'
        AND g.SLIP_DT BETWEEN @startDate AND @endDate
        AND g.CUST_CD IS NOT NULL AND g.CUST_CD <> ''
        ${searchClause}
      GROUP BY g.CUST_CD
      `,
      { corpCode: CORP_CODE, startDate: params.startDate, endDate: params.endDate, ...arAccountParams(), ...searchParams },
    ),
    yerpQuery<{ CUST_CD: string | null; CUST_NM: string | null; BALANCE: number | null }>(
      `
      SELECT g.CUST_CD, MAX(g.CUST_NM) AS CUST_NM,
        SUM(CASE WHEN g.DEB_CRD = '3' THEN g.AMT ELSE -g.AMT END) AS BALANCE
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode
        AND ${arAccountClause("g")}
        AND g.SLIP_DT <= @endDate
        AND g.CUST_CD IS NOT NULL AND g.CUST_CD <> ''
        ${searchClause}
      GROUP BY g.CUST_CD
      HAVING SUM(CASE WHEN g.DEB_CRD = '3' THEN g.AMT ELSE -g.AMT END) <> 0
      `,
      { corpCode: CORP_CODE, endDate: params.endDate, ...arAccountParams(), ...searchParams },
    ),
  ]);

  const receiptMap = new Map<string, { name: string; receipt: number }>();
  for (const r of periodRows) {
    if (r.CUST_CD) receiptMap.set(r.CUST_CD, { name: r.CUST_NM ?? r.CUST_CD, receipt: Number(r.RECEIPT ?? 0) });
  }
  const balanceMap = new Map<string, { name: string; balance: number }>();
  for (const r of balanceRows) {
    if (r.CUST_CD) balanceMap.set(r.CUST_CD, { name: r.CUST_NM ?? r.CUST_CD, balance: Number(r.BALANCE ?? 0) });
  }

  const codes = new Set([...receiptMap.keys(), ...balanceMap.keys()]);
  const result: CustomerCollection[] = [];
  for (const code of codes) {
    const receipt = receiptMap.get(code);
    const balance = balanceMap.get(code);
    result.push({
      customerCode: code,
      customerName: receipt?.name ?? balance?.name ?? code,
      periodReceipt: receipt?.receipt ?? 0,
      balance: balance?.balance ?? 0,
    });
  }

  result.sort((a, b) => b.periodReceipt - a.periodReceipt || b.balance - a.balance);
  return result;
}

export async function getCollectionsSummary(params: {
  startDate: string;
  endDate: string;
}): Promise<{ totalReceipt: number; totalBalance: number; outstandingCustomerCount: number }> {
  const [receiptRows, balanceRows] = await Promise.all([
    yerpQuery<{ TOTAL: number | null }>(
      `
      SELECT SUM(g.AMT) AS TOTAL
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode
        AND ${arAccountClause("g")}
        AND g.DEB_CRD = '4'
        AND g.SLIP_DT BETWEEN @startDate AND @endDate
      `,
      { corpCode: CORP_CODE, startDate: params.startDate, endDate: params.endDate, ...arAccountParams() },
    ),
    yerpQuery<{ CUST_CD: string | null; BALANCE: number | null }>(
      `
      SELECT g.CUST_CD, SUM(CASE WHEN g.DEB_CRD = '3' THEN g.AMT ELSE -g.AMT END) AS BALANCE
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode
        AND ${arAccountClause("g")}
        AND g.SLIP_DT <= @endDate
        AND g.CUST_CD IS NOT NULL AND g.CUST_CD <> ''
      GROUP BY g.CUST_CD
      HAVING SUM(CASE WHEN g.DEB_CRD = '3' THEN g.AMT ELSE -g.AMT END) <> 0
      `,
      { corpCode: CORP_CODE, endDate: params.endDate, ...arAccountParams() },
    ),
  ]);

  const totalBalance = balanceRows.reduce((sum, r) => sum + Number(r.BALANCE ?? 0), 0);
  const outstandingCustomerCount = balanceRows.filter((r) => Number(r.BALANCE ?? 0) > 0).length;

  return {
    totalReceipt: Number(receiptRows[0]?.TOTAL ?? 0),
    totalBalance,
    outstandingCustomerCount,
  };
}

import "server-only";
import { yerpQuery } from "./client";

const CORP_CODE = "0460";
// 회계 담당자가 수금 전용 화면 대신 일반전표에 직접 분개하는 관행이라,
// 매출채권 계정(외상매출금 0108, 받을어음 0110)의 전표로 원장을 구성한다.
// 차변(3) = 매출 발생(외상 증가), 대변(4) = 수금(외상 감소).
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
  beginBalance: number;
  periodDebit: number;
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

  const [beginRows, periodRows] = await Promise.all([
    yerpQuery<{ CUST_CD: string | null; CUST_NM: string | null; BEGIN_BAL: number | null }>(
      `
      SELECT g.CUST_CD, MAX(g.CUST_NM) AS CUST_NM,
        SUM(CASE WHEN g.DEB_CRD = '3' THEN g.AMT ELSE -g.AMT END) AS BEGIN_BAL
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode
        AND ${arAccountClause("g")}
        AND g.SLIP_DT < @startDate
        AND g.CUST_CD IS NOT NULL AND g.CUST_CD <> ''
        ${searchClause}
      GROUP BY g.CUST_CD
      `,
      { corpCode: CORP_CODE, startDate: params.startDate, ...arAccountParams(), ...searchParams },
    ),
    yerpQuery<{ CUST_CD: string | null; CUST_NM: string | null; DEBIT: number | null; RECEIPT: number | null }>(
      `
      SELECT g.CUST_CD, MAX(g.CUST_NM) AS CUST_NM,
        SUM(CASE WHEN g.DEB_CRD = '3' THEN g.AMT ELSE 0 END) AS DEBIT,
        SUM(CASE WHEN g.DEB_CRD = '4' THEN g.AMT ELSE 0 END) AS RECEIPT
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode
        AND ${arAccountClause("g")}
        AND g.SLIP_DT BETWEEN @startDate AND @endDate
        AND g.CUST_CD IS NOT NULL AND g.CUST_CD <> ''
        ${searchClause}
      GROUP BY g.CUST_CD
      `,
      {
        corpCode: CORP_CODE,
        startDate: params.startDate,
        endDate: params.endDate,
        ...arAccountParams(),
        ...searchParams,
      },
    ),
  ]);

  const beginMap = new Map<string, { name: string; beginBalance: number }>();
  for (const r of beginRows) {
    if (r.CUST_CD) beginMap.set(r.CUST_CD, { name: r.CUST_NM ?? r.CUST_CD, beginBalance: Number(r.BEGIN_BAL ?? 0) });
  }
  const periodMap = new Map<string, { name: string; debit: number; receipt: number }>();
  for (const r of periodRows) {
    if (r.CUST_CD) {
      periodMap.set(r.CUST_CD, {
        name: r.CUST_NM ?? r.CUST_CD,
        debit: Number(r.DEBIT ?? 0),
        receipt: Number(r.RECEIPT ?? 0),
      });
    }
  }

  const codes = new Set([...beginMap.keys(), ...periodMap.keys()]);
  const result: CustomerCollection[] = [];
  for (const code of codes) {
    const begin = beginMap.get(code);
    const period = periodMap.get(code);
    const beginBalance = begin?.beginBalance ?? 0;
    const periodDebit = period?.debit ?? 0;
    const periodReceipt = period?.receipt ?? 0;
    if (beginBalance === 0 && periodDebit === 0 && periodReceipt === 0) continue;
    result.push({
      customerCode: code,
      customerName: begin?.name ?? period?.name ?? code,
      beginBalance,
      periodDebit,
      periodReceipt,
      balance: beginBalance + periodDebit - periodReceipt,
    });
  }

  result.sort((a, b) => b.balance - a.balance);
  return result;
}

export type CollectionLedgerEntry = {
  slipNo: string;
  slipDate: string;
  debCrd: "3" | "4";
  amount: number;
  note: string;
  counterAccount: string | null;
  runningBalance: number;
};

export type CustomerLedger = {
  customerCode: string;
  customerName: string;
  beginBalance: number;
  entries: CollectionLedgerEntry[];
  endBalance: number;
};

export async function getCustomerLedger(params: {
  customerCode: string;
  startDate: string;
  endDate: string;
}): Promise<CustomerLedger> {
  const [beginRows, txRows] = await Promise.all([
    yerpQuery<{ CUST_NM: string | null; BEGIN_BAL: number | null }>(
      `
      SELECT MAX(g.CUST_NM) AS CUST_NM,
        SUM(CASE WHEN g.DEB_CRD = '3' THEN g.AMT ELSE -g.AMT END) AS BEGIN_BAL
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode AND g.CUST_CD = @custCode
        AND ${arAccountClause("g")}
        AND g.SLIP_DT < @startDate
      `,
      { corpCode: CORP_CODE, custCode: params.customerCode, startDate: params.startDate, ...arAccountParams() },
    ),
    yerpQuery<{
      SLIP_NO: string;
      SLIP_DT: string;
      DEB_CRD: string;
      AMT: number | null;
      NOTE_NM: string | null;
      CUST_NM: string | null;
      COUNTER_ACCT: string | null;
    }>(
      `
      SELECT g.SLIP_NO, g.SLIP_DT, g.DEB_CRD, g.AMT, g.NOTE_NM, g.CUST_NM,
        (SELECT TOP 1 s2.ACC_SBJ_NM
         FROM SHUSER.AC_GNR_SLIP_T g2
         JOIN SHUSER.AC_ACC_SBJ_T s2 ON s2.ACC_SBJ_CD = g2.ACC_SBJ_CD AND s2.CORP_CODE = g2.CORP_CODE
         WHERE g2.CORP_CODE = g.CORP_CODE AND g2.SLIP_NO = g.SLIP_NO
           AND g2.DEB_CRD <> g.DEB_CRD AND g2.ACC_SBJ_CD NOT IN ('0108', '0110')
        ) AS COUNTER_ACCT
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode AND g.CUST_CD = @custCode
        AND ${arAccountClause("g")}
        AND g.SLIP_DT BETWEEN @startDate AND @endDate
      ORDER BY g.SLIP_DT ASC, g.SLIP_NO ASC
      `,
      {
        corpCode: CORP_CODE,
        custCode: params.customerCode,
        startDate: params.startDate,
        endDate: params.endDate,
        ...arAccountParams(),
      },
    ),
  ]);

  const beginBalance = Number(beginRows[0]?.BEGIN_BAL ?? 0);
  const customerName = beginRows[0]?.CUST_NM ?? txRows[0]?.CUST_NM ?? params.customerCode;

  let running = beginBalance;
  const entries: CollectionLedgerEntry[] = txRows.map((r) => {
    const amount = Number(r.AMT ?? 0);
    running += r.DEB_CRD === "3" ? amount : -amount;
    return {
      slipNo: r.SLIP_NO,
      slipDate: r.SLIP_DT,
      debCrd: r.DEB_CRD === "3" ? "3" : "4",
      amount,
      note: r.NOTE_NM ?? "",
      counterAccount: r.COUNTER_ACCT,
      runningBalance: running,
    };
  });

  return {
    customerCode: params.customerCode,
    customerName,
    beginBalance,
    entries,
    endBalance: running,
  };
}

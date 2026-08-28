import "server-only";
import { yerpQuery } from "./client";
import type { YerpCorpCode } from "./corps";

export type DisbursementCorpCode = YerpCorpCode;

// 외상매입금(0251, 원재료 매입)과 미지급금(0253, 부재료·포장재 등 매입) 둘 다 대상.
// Y-ERP는 원재료(소금) 매입은 0251로, 부재료(부자재)는 0253으로 계정을 나눠 쓴다 —
// 0251만 조회하면 부자재 매입처(수정실업/원지/제일산업 등)가 전부 누락되는 문제가 실사용 중 발견됨.
// 둘 다 부채 계정이라 자산 계정인 매출채권(collections.ts)과 차변/대변 방향이 반대다 —
// 실제 매입 전표(AC_PURC_SALE_T)와 대조 검증한 결과, 두 계정 모두 매입 발생은 전부 대변(4)으로 기록됨.
// 대변(4) = 매입발생(부채 증가), 차변(3) = 지급(부채 감소).
const AP_ACCOUNT_CODES = ["0251", "0253"];

function apAccountClause(alias: string) {
  return `${alias}.ACC_SBJ_CD IN (${AP_ACCOUNT_CODES.map((_, i) => `@accCode${i}`).join(", ")})`;
}
function apAccountParams() {
  return Object.fromEntries(AP_ACCOUNT_CODES.map((c, i) => [`accCode${i}`, c]));
}

export type VendorDisbursement = {
  vendorCode: string;
  vendorName: string;
  beginBalance: number;
  periodPurchase: number;
  periodPayment: number;
  balance: number;
};

export async function getDisbursementsByVendor(params: {
  corpCode: DisbursementCorpCode;
  startDate: string;
  endDate: string;
  search?: string;
}): Promise<VendorDisbursement[]> {
  const searchClause = params.search ? "AND g.CUST_NM LIKE @search" : "";
  const searchParams = params.search ? { search: `%${params.search}%` } : {};

  const [beginRows, periodRows] = await Promise.all([
    yerpQuery<{ CUST_CD: string | null; CUST_NM: string | null; BEGIN_BAL: number | null }>(
      `
      SELECT g.CUST_CD, MAX(g.CUST_NM) AS CUST_NM,
        SUM(CASE WHEN g.DEB_CRD = '4' THEN g.AMT ELSE -g.AMT END) AS BEGIN_BAL
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode
        AND ${apAccountClause("g")}
        AND g.SLIP_DT < @startDate
        AND g.CUST_CD IS NOT NULL AND g.CUST_CD <> ''
        ${searchClause}
      GROUP BY g.CUST_CD
      `,
      { corpCode: params.corpCode, startDate: params.startDate, ...apAccountParams(), ...searchParams },
    ),
    yerpQuery<{ CUST_CD: string | null; CUST_NM: string | null; PURCHASE: number | null; PAYMENT: number | null }>(
      `
      SELECT g.CUST_CD, MAX(g.CUST_NM) AS CUST_NM,
        SUM(CASE WHEN g.DEB_CRD = '4' THEN g.AMT ELSE 0 END) AS PURCHASE,
        SUM(CASE WHEN g.DEB_CRD = '3' THEN g.AMT ELSE 0 END) AS PAYMENT
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode
        AND ${apAccountClause("g")}
        AND g.SLIP_DT BETWEEN @startDate AND @endDate
        AND g.CUST_CD IS NOT NULL AND g.CUST_CD <> ''
        ${searchClause}
      GROUP BY g.CUST_CD
      `,
      {
        corpCode: params.corpCode,
        startDate: params.startDate,
        endDate: params.endDate,
        ...apAccountParams(),
        ...searchParams,
      },
    ),
  ]);

  const beginMap = new Map<string, { name: string; beginBalance: number }>();
  for (const r of beginRows) {
    if (r.CUST_CD) beginMap.set(r.CUST_CD, { name: r.CUST_NM ?? r.CUST_CD, beginBalance: Number(r.BEGIN_BAL ?? 0) });
  }
  const periodMap = new Map<string, { name: string; purchase: number; payment: number }>();
  for (const r of periodRows) {
    if (r.CUST_CD) {
      periodMap.set(r.CUST_CD, {
        name: r.CUST_NM ?? r.CUST_CD,
        purchase: Number(r.PURCHASE ?? 0),
        payment: Number(r.PAYMENT ?? 0),
      });
    }
  }

  const codes = new Set([...beginMap.keys(), ...periodMap.keys()]);
  const result: VendorDisbursement[] = [];
  for (const code of codes) {
    const begin = beginMap.get(code);
    const period = periodMap.get(code);
    const beginBalance = begin?.beginBalance ?? 0;
    const periodPurchase = period?.purchase ?? 0;
    const periodPayment = period?.payment ?? 0;
    if (beginBalance === 0 && periodPurchase === 0 && periodPayment === 0) continue;
    result.push({
      vendorCode: code,
      vendorName: begin?.name ?? period?.name ?? code,
      beginBalance,
      periodPurchase,
      periodPayment,
      balance: beginBalance + periodPurchase - periodPayment,
    });
  }

  return result.sort((a, b) => b.balance - a.balance);
}

export type DisbursementLedgerEntry = {
  slipNo: string;
  slipDate: string;
  debCrd: "3" | "4";
  amount: number;
  note: string;
  counterAccount: string | null;
  runningBalance: number;
};

export type VendorLedger = {
  vendorCode: string;
  vendorName: string;
  beginBalance: number;
  entries: DisbursementLedgerEntry[];
  endBalance: number;
};

export async function getVendorLedger(params: {
  corpCode: DisbursementCorpCode;
  vendorCode: string;
  startDate: string;
  endDate: string;
}): Promise<VendorLedger> {
  const [beginRows, txRows] = await Promise.all([
    yerpQuery<{ CUST_NM: string | null; BEGIN_BAL: number | null }>(
      `
      SELECT MAX(g.CUST_NM) AS CUST_NM,
        SUM(CASE WHEN g.DEB_CRD = '4' THEN g.AMT ELSE -g.AMT END) AS BEGIN_BAL
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode AND g.CUST_CD = @vendorCode
        AND ${apAccountClause("g")}
        AND g.SLIP_DT < @startDate
      `,
      {
        corpCode: params.corpCode,
        vendorCode: params.vendorCode,
        startDate: params.startDate,
        ...apAccountParams(),
      },
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
         WHERE g2.CORP_CODE = g.CORP_CODE AND g2.SLIP_NO = g.SLIP_NO AND g2.SLIP_DT = g.SLIP_DT
           AND g2.DEB_CRD <> g.DEB_CRD AND g2.ACC_SBJ_CD NOT IN (${AP_ACCOUNT_CODES.map((_, i) => `@accCode${i}`).join(", ")})
        ) AS COUNTER_ACCT
      FROM SHUSER.AC_GNR_SLIP_T g
      WHERE g.CORP_CODE = @corpCode AND g.CUST_CD = @vendorCode
        AND ${apAccountClause("g")}
        AND g.SLIP_DT BETWEEN @startDate AND @endDate
      ORDER BY g.SLIP_DT ASC, g.SLIP_NO ASC
      `,
      {
        corpCode: params.corpCode,
        vendorCode: params.vendorCode,
        startDate: params.startDate,
        endDate: params.endDate,
        ...apAccountParams(),
      },
    ),
  ]);

  const beginBalance = Number(beginRows[0]?.BEGIN_BAL ?? 0);
  const vendorName = beginRows[0]?.CUST_NM ?? txRows[0]?.CUST_NM ?? params.vendorCode;

  let running = beginBalance;
  const entries: DisbursementLedgerEntry[] = txRows.map((r) => {
    const amount = Number(r.AMT ?? 0);
    running += r.DEB_CRD === "4" ? amount : -amount;
    return {
      slipNo: r.SLIP_NO,
      slipDate: r.SLIP_DT,
      debCrd: r.DEB_CRD === "4" ? "4" : "3",
      amount,
      note: r.NOTE_NM ?? "",
      counterAccount: r.COUNTER_ACCT,
      runningBalance: running,
    };
  });

  return {
    vendorCode: params.vendorCode,
    vendorName,
    beginBalance,
    entries,
    endBalance: running,
  };
}

import "server-only";
import { yerpQuery } from "./client";
import type { ExecutiveCorpCode } from "./executive-corps";

// 손익자료 탭의 "전산(Y-ERP 자동집계)" 값. 03-decisions.md에서 확인한 대로
// 매출원가는 일반전표에 기록되지 않아 계산할 수 없다 — 회계팀 확정 자료(TASK-006)에만 의존.
// 매출: TASK-003과 동일한 AC_PURC_SALE_T 방식. 판관비: 일반전표 0802~0840 계정 합계.
export type SystemProfitLoss = {
  corpCode: ExecutiveCorpCode;
  revenue: number;
  cogs: null;
  sga: number;
};

export async function getSystemProfitLoss(params: {
  corpCode: ExecutiveCorpCode;
  startDate: string;
  endDate: string;
}): Promise<SystemProfitLoss> {
  const [revenueRows, sgaRows] = await Promise.all([
    yerpQuery<{ TOTAL: number | null }>(
      `
      SELECT SUM(SPLY_PRC + ISNULL(VAT, 0)) AS TOTAL
      FROM SHUSER.AC_PURC_SALE_T
      WHERE CORP_CODE = @corpCode AND PURC_SALE_SEC = '1'
        AND SLIP_DT BETWEEN @startDate AND @endDate
      `,
      { corpCode: params.corpCode, startDate: params.startDate, endDate: params.endDate },
    ),
    yerpQuery<{ TOTAL: number | null }>(
      `
      SELECT SUM(AMT) AS TOTAL
      FROM SHUSER.AC_GNR_SLIP_T
      WHERE CORP_CODE = @corpCode
        AND ACC_SBJ_CD BETWEEN '0802' AND '0840'
        AND SLIP_DT BETWEEN @startDate AND @endDate
      `,
      { corpCode: params.corpCode, startDate: params.startDate, endDate: params.endDate },
    ),
  ]);

  return {
    corpCode: params.corpCode,
    revenue: Number(revenueRows[0]?.TOTAL ?? 0),
    cogs: null,
    sga: Number(sgaRows[0]?.TOTAL ?? 0),
  };
}

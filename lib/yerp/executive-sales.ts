import "server-only";
import { yerpQuery } from "./client";
import type { ExecutiveCorpCode } from "./executive-corps";

// 매출조회(AC_PURC_SALE_T, PURC_SALE_SEC='1')는 태평소금(0460)뿐 아니라 태평염전(0400)·
// 섬들채(0360)·박물관(0440) 4개 법인 전부 실데이터가 있음을 확인했다 (기존 sales.ts가 쓰는
// PM_SALES_MGMT는 0460에만 데이터가 있어 임원실 화면에는 쓸 수 없다).
// 날짜 파라미터는 기존 lib/yerp 모듈과 동일하게 'YYYYMMDD' 문자열이어야 한다 (호출측 toYmd()).

export type ExecutiveCustomerSales = {
  customerCode: string;
  customerName: string;
  amount: number;
};

export type CorpSalesTotal = {
  corpCode: ExecutiveCorpCode;
  total: number;
};

// 법인별 매출 합계 (주간업무보고 1페이지 "전 사업장 매출실적"용).
export async function getSalesTotalByCorp(params: {
  corpCodes: readonly ExecutiveCorpCode[];
  startDate: string;
  endDate: string;
}): Promise<CorpSalesTotal[]> {
  const rows = await yerpQuery<{ CORP_CODE: string; TOTAL: number | null }>(
    `
    SELECT CORP_CODE, SUM(SPLY_PRC + ISNULL(VAT, 0)) AS TOTAL
    FROM SHUSER.AC_PURC_SALE_T
    WHERE CORP_CODE IN (${params.corpCodes.map((_, i) => `@corp${i}`).join(",")})
      AND PURC_SALE_SEC = '1'
      AND SLIP_DT BETWEEN @startDate AND @endDate
    GROUP BY CORP_CODE
    `,
    {
      ...Object.fromEntries(params.corpCodes.map((c, i) => [`corp${i}`, c])),
      startDate: params.startDate,
      endDate: params.endDate,
    },
  );

  const byCorp = new Map(rows.map((r) => [r.CORP_CODE, Number(r.TOTAL ?? 0)]));
  return params.corpCodes.map((corpCode) => ({ corpCode, total: byCorp.get(corpCode) ?? 0 }));
}

// 법인 하나의 판매처별 매출 (태평염전/태평소금/섬들채 페이지 공용 — 화면에서 상위 N개 + 기타로 묶어 표시).
export async function getSalesByCustomer(params: {
  corpCode: ExecutiveCorpCode;
  startDate: string;
  endDate: string;
}): Promise<ExecutiveCustomerSales[]> {
  const rows = await yerpQuery<{ CUST_CD: string; CUST_NM: string | null; AMOUNT: number | null }>(
    `
    SELECT CUST_CD, MAX(CUST_NM) AS CUST_NM, SUM(SPLY_PRC + ISNULL(VAT, 0)) AS AMOUNT
    FROM SHUSER.AC_PURC_SALE_T
    WHERE CORP_CODE = @corpCode
      AND PURC_SALE_SEC = '1'
      AND SLIP_DT BETWEEN @startDate AND @endDate
    GROUP BY CUST_CD
    ORDER BY AMOUNT DESC
    `,
    { corpCode: params.corpCode, startDate: params.startDate, endDate: params.endDate },
  );

  return rows.map((r) => ({
    customerCode: r.CUST_CD,
    customerName: r.CUST_NM ?? r.CUST_CD,
    amount: Number(r.AMOUNT ?? 0),
  }));
}

// 섬들채 채널별 매출. Y-ERP 거래처명이 "소금가게-소비자매출"처럼 "{채널명}-소비자매출"
// 관행으로 등록돼 있어(실데이터로 확인됨), 그 이름 규칙을 그대로 채널 구분에 쓴다.
// 규칙에 맞지 않는 거래처(일반 도소매 거래처)는 "기타"로 묶는다.
export async function getSeomdeulchaeSalesByChannel(params: {
  startDate: string;
  endDate: string;
}): Promise<{ channel: string; amount: number }[]> {
  const rows = await getSalesByCustomer({ corpCode: "0360", startDate: params.startDate, endDate: params.endDate });

  const byChannel = new Map<string, number>();
  for (const row of rows) {
    const match = row.customerName.match(/^(.+)-소비자매출$/);
    const channel = match ? match[1] : "기타";
    byChannel.set(channel, (byChannel.get(channel) ?? 0) + row.amount);
  }

  return [...byChannel.entries()]
    .map(([channel, amount]) => ({ channel, amount }))
    .sort((a, b) => b.amount - a.amount);
}

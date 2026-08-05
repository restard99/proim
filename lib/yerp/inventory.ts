import "server-only";
import { yerpQuery } from "./client";

const CORP_CODE = "0460";

export type InventoryCategory = "부자재" | "완제품" | "3자물류";

const CATEGORY_PATTERNS: Record<InventoryCategory, string[]> = {
  부자재: ["%부자재%", "%원재료%"],
  완제품: ["%완제품%"],
  "3자물류": ["%3자물류%"],
};

async function getStorageCodes(category: InventoryCategory): Promise<string[]> {
  const patterns = CATEGORY_PATTERNS[category];
  const likeClause = patterns.map((_, i) => `STORAGE_NM LIKE @p${i}`).join(" OR ");

  const rows = await yerpQuery<{ STORAGE_CD: string }>(
    `SELECT STORAGE_CD FROM SHUSER.PM_STORAGE WHERE CORP_CODE = @corpCode AND USE_YN = '1' AND (${likeClause})`,
    { corpCode: CORP_CODE, ...Object.fromEntries(patterns.map((p, i) => [`p${i}`, p])) },
  );

  return rows.map((r) => r.STORAGE_CD);
}

export type InventoryLedgerRow = {
  itemCode: string;
  itemName: string;
  unitPrice: number;
  beginQty: number;
  beginAmt: number;
  inQty: number;
  inAmt: number;
  outQty: number;
  outAmt: number;
  endQty: number;
  endAmt: number;
};

export function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${y}${pad(m)}01`, end: `${y}${pad(m)}${pad(lastDay)}` };
}

export async function getInventoryLedger(
  category: InventoryCategory,
  period?: { start: string; end: string },
): Promise<{
  rows: InventoryLedgerRow[];
  totalBeginAmt: number;
  totalInAmt: number;
  totalOutAmt: number;
  totalEndAmt: number;
}> {
  const storageCodes = await getStorageCodes(category);
  if (storageCodes.length === 0) {
    return { rows: [], totalBeginAmt: 0, totalInAmt: 0, totalOutAmt: 0, totalEndAmt: 0 };
  }

  const { start: periodStart, end: periodEnd } = period ?? currentMonthRange();
  const storageIn = storageCodes.map((_, i) => `@s${i}`).join(", ");
  const storageParams = Object.fromEntries(storageCodes.map((c, i) => [`s${i}`, c]));

  // PM_QTY_IO.AMT는 거래 유형에 따라 비어있는 경우가 많아(특히 생산 관련 출고),
  // 금액을 그대로 합산하면 "출고금액 = 단가 × 수량"이 어긋난다.
  // 대신 수량만 집계하고, 단가는 가장 최근 입고성 거래의 UC(단가)로 별도 산출해
  // 모든 금액(기초/입고/출고/기말)을 "단가 × 수량"으로 일관되게 계산한다.
  const [qtyRows, ucRows] = await Promise.all([
    yerpQuery<{
      ITM_CD: string;
      ITM_NM: string | null;
      BEGIN_QTY: number | null;
      IN_QTY: number | null;
      OUT_QTY: number | null;
    }>(
      `
      SELECT q.ITM_CD, MAX(i.ITM_NM) AS ITM_NM,
        SUM(CASE WHEN q.QTY_DT < @periodStart THEN (CASE WHEN ioc.INOUT_SEC = '1' THEN q.QTY ELSE -q.QTY END) ELSE 0 END) AS BEGIN_QTY,
        SUM(CASE WHEN q.QTY_DT BETWEEN @periodStart AND @periodEnd AND ioc.INOUT_SEC = '1' THEN q.QTY ELSE 0 END) AS IN_QTY,
        SUM(CASE WHEN q.QTY_DT BETWEEN @periodStart AND @periodEnd AND ioc.INOUT_SEC = '2' THEN q.QTY ELSE 0 END) AS OUT_QTY
      FROM SHUSER.PM_QTY_IO q
      JOIN SHUSER.PM_IO_CODE ioc ON ioc.IO_SEC = q.IO_SEC AND ioc.CORP_CODE = q.CORP_CODE
      LEFT JOIN SHUSER.PM_ITEM i ON i.CORP_CODE = q.CORP_CODE AND i.ITM_CD = q.ITM_CD
      WHERE q.CORP_CODE = @corpCode AND q.STORAGE_CD IN (${storageIn}) AND q.QTY_DT <= @periodEnd
      GROUP BY q.ITM_CD
      `,
      { corpCode: CORP_CODE, periodStart, periodEnd, ...storageParams },
    ),
    yerpQuery<{ ITM_CD: string; UC: number }>(
      `
      SELECT ITM_CD, UC FROM (
        SELECT q.ITM_CD, q.UC, ROW_NUMBER() OVER (PARTITION BY q.ITM_CD ORDER BY q.QTY_DT DESC) AS rn
        FROM SHUSER.PM_QTY_IO q
        JOIN SHUSER.PM_IO_CODE ioc ON ioc.IO_SEC = q.IO_SEC AND ioc.CORP_CODE = q.CORP_CODE
        WHERE q.CORP_CODE = @corpCode AND q.STORAGE_CD IN (${storageIn})
          AND ioc.INOUT_SEC = '1' AND q.UC IS NOT NULL AND q.UC <> 0 AND q.QTY_DT <= @periodEnd
      ) t WHERE rn = 1
      `,
      { corpCode: CORP_CODE, periodEnd, ...storageParams },
    ),
  ]);

  const unitPriceByItem = new Map(ucRows.map((r) => [r.ITM_CD, Number(r.UC)]));

  const mapped = qtyRows
    .map((r) => {
      const beginQty = Number(r.BEGIN_QTY ?? 0);
      const inQty = Number(r.IN_QTY ?? 0);
      const outQty = Number(r.OUT_QTY ?? 0);
      const endQty = beginQty + inQty - outQty;
      const unitPrice = unitPriceByItem.get(r.ITM_CD) ?? 0;
      return {
        itemCode: r.ITM_CD,
        itemName: r.ITM_NM ?? r.ITM_CD,
        unitPrice,
        beginQty,
        beginAmt: beginQty * unitPrice,
        inQty,
        inAmt: inQty * unitPrice,
        outQty,
        outAmt: outQty * unitPrice,
        endQty,
        endAmt: endQty * unitPrice,
      };
    })
    .filter((r) => r.beginQty !== 0 || r.inQty !== 0 || r.outQty !== 0 || r.endQty !== 0)
    .sort((a, b) => b.endAmt - a.endAmt);

  return {
    rows: mapped,
    totalBeginAmt: mapped.reduce((sum, r) => sum + r.beginAmt, 0),
    totalInAmt: mapped.reduce((sum, r) => sum + r.inAmt, 0),
    totalOutAmt: mapped.reduce((sum, r) => sum + r.outAmt, 0),
    totalEndAmt: mapped.reduce((sum, r) => sum + r.endAmt, 0),
  };
}

export type InventoryMovementRow = {
  date: string;
  itemName: string;
  storageName: string;
  ioSecName: string;
  direction: "in" | "out";
  quantity: number;
  amount: number;
};

export async function getInventoryMovements(category: InventoryCategory, limit = 30): Promise<InventoryMovementRow[]> {
  const storageCodes = await getStorageCodes(category);
  if (storageCodes.length === 0) return [];

  const storageIn = storageCodes.map((_, i) => `@s${i}`).join(", ");
  const storageParams = Object.fromEntries(storageCodes.map((c, i) => [`s${i}`, c]));
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);

  const rows = await yerpQuery<{
    QTY_DT: string;
    ITM_NM: string | null;
    STORAGE_NM: string | null;
    IO_SEC_NM: string;
    INOUT_SEC: string;
    QTY: number | null;
    AMT: number | null;
  }>(
    `
    SELECT TOP ${safeLimit} q.QTY_DT, i.ITM_NM, s.STORAGE_NM, ioc.IO_SEC_NM, ioc.INOUT_SEC, q.QTY, q.AMT
    FROM SHUSER.PM_QTY_IO q
    JOIN SHUSER.PM_IO_CODE ioc ON ioc.IO_SEC = q.IO_SEC AND ioc.CORP_CODE = q.CORP_CODE
    LEFT JOIN SHUSER.PM_ITEM i ON i.CORP_CODE = q.CORP_CODE AND i.ITM_CD = q.ITM_CD
    LEFT JOIN SHUSER.PM_STORAGE s ON s.CORP_CODE = q.CORP_CODE AND s.STORAGE_CD = q.STORAGE_CD
    WHERE q.CORP_CODE = @corpCode AND q.STORAGE_CD IN (${storageIn})
    ORDER BY q.QTY_DT DESC
    `,
    { corpCode: CORP_CODE, ...storageParams },
  );

  return rows.map((r) => ({
    date: r.QTY_DT,
    itemName: r.ITM_NM ?? "-",
    storageName: r.STORAGE_NM ?? "-",
    ioSecName: r.IO_SEC_NM,
    direction: r.INOUT_SEC === "1" ? "in" : "out",
    quantity: Number(r.QTY ?? 0),
    amount: Number(r.AMT ?? 0),
  }));
}

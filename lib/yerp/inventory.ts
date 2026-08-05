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

export type InventoryBalanceRow = { itemCode: string; itemName: string; quantity: number; amount: number };

export async function getInventoryBalance(
  category: InventoryCategory,
): Promise<{ rows: InventoryBalanceRow[]; totalQuantity: number; totalAmount: number }> {
  const storageCodes = await getStorageCodes(category);
  if (storageCodes.length === 0) return { rows: [], totalQuantity: 0, totalAmount: 0 };

  const storageIn = storageCodes.map((_, i) => `@s${i}`).join(", ");
  const storageParams = Object.fromEntries(storageCodes.map((c, i) => [`s${i}`, c]));

  const rows = await yerpQuery<{ ITM_CD: string; ITM_NM: string | null; BAL_QTY: number | null; BAL_AMT: number | null }>(
    `
    SELECT q.ITM_CD, MAX(i.ITM_NM) AS ITM_NM,
      SUM(CASE WHEN ioc.INOUT_SEC = '1' THEN q.QTY ELSE -q.QTY END) AS BAL_QTY,
      SUM(CASE WHEN ioc.INOUT_SEC = '1' THEN q.AMT ELSE -q.AMT END) AS BAL_AMT
    FROM SHUSER.PM_QTY_IO q
    JOIN SHUSER.PM_IO_CODE ioc ON ioc.IO_SEC = q.IO_SEC AND ioc.CORP_CODE = q.CORP_CODE
    LEFT JOIN SHUSER.PM_ITEM i ON i.CORP_CODE = q.CORP_CODE AND i.ITM_CD = q.ITM_CD
    WHERE q.CORP_CODE = @corpCode AND q.STORAGE_CD IN (${storageIn})
    GROUP BY q.ITM_CD
    HAVING SUM(CASE WHEN ioc.INOUT_SEC = '1' THEN q.QTY ELSE -q.QTY END) <> 0
    ORDER BY BAL_QTY DESC
    `,
    { corpCode: CORP_CODE, ...storageParams },
  );

  const mapped = rows.map((r) => ({
    itemCode: r.ITM_CD,
    itemName: r.ITM_NM ?? r.ITM_CD,
    quantity: Number(r.BAL_QTY ?? 0),
    amount: Number(r.BAL_AMT ?? 0),
  }));

  return {
    rows: mapped,
    totalQuantity: mapped.reduce((sum, r) => sum + r.quantity, 0),
    totalAmount: mapped.reduce((sum, r) => sum + r.amount, 0),
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

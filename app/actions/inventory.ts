"use server";

import {
  getInventoryLedger,
  getInventoryMovements,
  type InventoryCategory,
  type InventoryLedgerRow,
  type InventoryMovementRow,
} from "@/lib/yerp/inventory";

export type InventoryData = {
  rows: InventoryLedgerRow[];
  totalBeginAmt: number;
  totalInAmt: number;
  totalOutAmt: number;
  totalEndAmt: number;
  movements: InventoryMovementRow[];
};

export async function getInventoryData(
  category: InventoryCategory,
  period?: { start: string; end: string },
): Promise<InventoryData> {
  const [ledger, movements] = await Promise.all([
    getInventoryLedger(category, period),
    getInventoryMovements(category),
  ]);

  return { ...ledger, movements };
}

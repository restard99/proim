"use server";

import { getInventoryLedger, type InventoryCategory, type InventoryLedgerRow } from "@/lib/yerp/inventory";

export type InventoryData = {
  rows: InventoryLedgerRow[];
  totalBeginAmt: number;
  totalInAmt: number;
  totalOutAmt: number;
  totalEndAmt: number;
};

export async function getInventoryData(
  category: InventoryCategory,
  period?: { start: string; end: string },
): Promise<InventoryData> {
  return getInventoryLedger(category, period);
}

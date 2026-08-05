"use server";

import {
  getInventoryBalance,
  getInventoryMovements,
  type InventoryCategory,
  type InventoryBalanceRow,
  type InventoryMovementRow,
} from "@/lib/yerp/inventory";

export type InventoryData = {
  rows: InventoryBalanceRow[];
  totalQuantity: number;
  totalAmount: number;
  movements: InventoryMovementRow[];
};

export async function getInventoryData(category: InventoryCategory): Promise<InventoryData> {
  const [balance, movements] = await Promise.all([
    getInventoryBalance(category),
    getInventoryMovements(category),
  ]);

  return { ...balance, movements };
}

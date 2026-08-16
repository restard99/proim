import "server-only";
import { yerpQuery } from "./client";
import { PRODUCT_CATEGORY_BY_CODE, type SaltCategory } from "./product-category";
import { PRODUCT_WEIGHT_OVERRIDE_KG } from "./product-weight-override";

const CORP_CODE = "0460";
// "생산품입고"(생산 실적이 재고로 들어오는 시점) — Y-ERP PM_IO_CODE 기준 확인된 코드.
const PRODUCTION_RECEIPT_IO_SEC = "8";

export type CategoryOutput = {
  category: SaltCategory;
  qtyKg: number;
  itemCount: number;
  unweightedItemCount: number;
};

export type UnweightedItem = {
  itemCode: string;
  itemName: string;
  qty: number;
};

export type ProductionByCategoryResult = {
  byCategory: CategoryOutput[];
  unweightedItems: UnweightedItem[];
};

// 기간 내 "생산품입고" 수량을 천일염/가공염으로 나눠 집계한다. 품목별 중량(WEIGHT_QTY)이
// Y-ERP 마스터에 등록돼 있어야 kg으로 환산되므로, 수량(QTY) × 중량(WEIGHT_QTY)으로 계산한다.
// 중량이 비어있는(0) 품목은 그만큼 과소집계되므로 unweightedItems로 별도 보고한다
// (조용히 틀린 숫자를 보여주는 것보다, 빠진 부분이 있다는 걸 드러내는 쪽이 안전하다).
export async function getProductionByCategory(params: {
  startDate: string;
  endDate: string;
}): Promise<ProductionByCategoryResult> {
  const rows = await yerpQuery<{
    ITM_CD: string;
    ITM_NM: string | null;
    WEIGHT_QTY: number | null;
    QTY: number | null;
  }>(
    `
    SELECT q.ITM_CD, i.ITM_NM, i.WEIGHT_QTY, SUM(q.QTY) AS QTY
    FROM SHUSER.PM_QTY_IO q
    LEFT JOIN SHUSER.PM_ITEM i ON i.CORP_CODE = q.CORP_CODE AND i.ITM_CD = q.ITM_CD
    WHERE q.CORP_CODE = @corpCode AND q.IO_SEC = @ioSec
      AND q.QTY_DT BETWEEN @startDate AND @endDate
    GROUP BY q.ITM_CD, i.ITM_NM, i.WEIGHT_QTY
    `,
    {
      corpCode: CORP_CODE,
      ioSec: PRODUCTION_RECEIPT_IO_SEC,
      startDate: params.startDate,
      endDate: params.endDate,
    },
  );

  const totals = new Map<SaltCategory, { qtyKg: number; itemCount: number; unweightedItemCount: number }>();
  const unweightedItems: UnweightedItem[] = [];

  for (const row of rows) {
    const category = PRODUCT_CATEGORY_BY_CODE[row.ITM_CD];
    if (!category) continue; // 소금 외 상품(육수 등) 또는 미분류 품목은 집계에서 제외

    const qty = Number(row.QTY ?? 0);
    // Y-ERP 마스터 중량이 비어있으면(회사 측 정리 전까지) 사용자가 직접 채워 넣은 임시
    // 보정표를 폴백으로 쓴다. 둘 다 없으면 여전히 0으로 남아 unweightedItems에 잡힌다.
    const weight = Number(row.WEIGHT_QTY ?? 0) || PRODUCT_WEIGHT_OVERRIDE_KG[row.ITM_CD] || 0;
    const entry = totals.get(category) ?? { qtyKg: 0, itemCount: 0, unweightedItemCount: 0 };
    entry.qtyKg += qty * weight;
    entry.itemCount += 1;
    if (weight === 0) {
      entry.unweightedItemCount += 1;
      unweightedItems.push({ itemCode: row.ITM_CD, itemName: row.ITM_NM ?? row.ITM_CD, qty });
    }
    totals.set(category, entry);
  }

  const byCategory: CategoryOutput[] = (["천일염", "가공염"] as const).map((category) => {
    const entry = totals.get(category) ?? { qtyKg: 0, itemCount: 0, unweightedItemCount: 0 };
    return { category, ...entry };
  });

  return { byCategory, unweightedItems };
}

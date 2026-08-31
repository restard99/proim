import "server-only";
import { getProductionByCategory } from "./production-output";
import type { SaltCategory } from "./product-category";

// 주간업무보고 4페이지(태평소금 생산)용 얇은 래퍼. 기존 production-output.ts의
// getProductionByCategory가 이미 임의 기간(주간/월간/전년동월)을 받아 천일염/가공염
// 생산량(kg)을 반환하므로 로직을 새로 만들지 않고 그대로 재사용한다.
export async function getTaepyeongSogeumProduction(params: {
  startDate: string;
  endDate: string;
}): Promise<{ category: SaltCategory; qtyKg: number }[]> {
  const result = await getProductionByCategory(params);
  return result.byCategory.map((c) => ({ category: c.category, qtyKg: c.qtyKg }));
}

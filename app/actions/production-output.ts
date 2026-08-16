"use server";

import { createClient } from "@/lib/supabase/server";
import { getProductionByCategory, type ProductionByCategoryResult } from "@/lib/yerp/production-output";

export async function getProductionByCategoryData(params: {
  startDate: string;
  endDate: string;
}): Promise<ProductionByCategoryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { byCategory: [], unweightedItems: [] };

  return getProductionByCategory(params);
}

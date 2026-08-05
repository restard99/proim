"use server";

import { createClient } from "@/lib/supabase/server";
import { getSalesByCustomer, getSalesTotal } from "@/lib/yerp/sales";

export type YearlyProgress = {
  year: number;
  targetTotal: number;
  achievedTotal: number;
  byCustomer: { customerCode: string; customerName: string; target: number; achieved: number }[];
};

export async function getYearlyProgress(year: number): Promise<YearlyProgress> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let tenantId: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    tenantId = (profile?.tenant_id as string) ?? null;
  }

  const { data: targets } = tenantId
    ? await supabase
        .from("sales_targets")
        .select("customer_code, target_amount")
        .eq("tenant_id", tenantId)
        .eq("year", year)
    : { data: [] as { customer_code: string | null; target_amount: number }[] };

  const overallTarget = (targets ?? []).find((t) => !t.customer_code)?.target_amount ?? 0;
  const customerTargetMap = new Map(
    (targets ?? []).filter((t) => t.customer_code).map((t) => [t.customer_code as string, t.target_amount]),
  );

  const startDate = `${year}0101`;
  const endDate = `${year}1231`;
  const [{ total: achievedTotal }, customerRows] = await Promise.all([
    getSalesTotal({ startDate, endDate }),
    getSalesByCustomer({ startDate, endDate }),
  ]);

  const byCustomer = customerRows
    .filter((r) => customerTargetMap.has(r.customerCode))
    .map((r) => ({
      customerCode: r.customerCode,
      customerName: r.customerName,
      target: customerTargetMap.get(r.customerCode) ?? 0,
      achieved: r.amount,
    }));

  return { year, targetTotal: overallTarget, achievedTotal, byCustomer };
}

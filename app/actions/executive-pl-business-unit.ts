"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parsePlBusinessUnitWorkbook } from "@/lib/executive/parse-pl-business-unit";

const MAX_SIZE = 15 * 1024 * 1024;
const SEOMDEULCHAE_CORP = "0360";

export type UploadResult = { ok: true; recordCount: number } | { ok: false; message: string; errors?: string[] };

export type PlBusinessUnitUploadHistoryRow = {
  created_at: string;
  file_name: string | null;
  uploaded_by_name: string | null;
  row_count: number;
};

async function getSelf(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("tenant_id, team, role").eq("id", user.id).single();
  if (!profile) return null;

  return { userId: user.id, tenantId: profile.tenant_id as string, team: profile.team as string, role: profile.role as string };
}

export async function uploadPlBusinessUnit(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  const yearRaw = formData.get("year");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "파일을 선택하세요." };
  if (file.size > MAX_SIZE) return { ok: false, message: "파일 크기는 15MB 이하만 가능합니다." };
  if (!/\.xlsx$/i.test(file.name)) return { ok: false, message: "엑셀(.xlsx) 파일만 업로드할 수 있습니다." };
  const year = Number(yearRaw);
  if (!year || year < 2000 || year > 2100) return { ok: false, message: "연도를 선택하세요." };

  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };
  if (self.role !== "admin") return { ok: false, message: "업로드 권한이 없습니다." };

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parsePlBusinessUnitWorkbook(buffer, year);
  } catch (err) {
    const message = err instanceof Error ? err.message : "엑셀 파일을 읽는 중 오류가 발생했습니다.";
    return { ok: false, message };
  }
  if (!parsed.ok) return { ok: false, message: `업로드 실패 (${parsed.errors.length}건 오류)`, errors: parsed.errors };

  const rows = parsed.rows.map((r) => ({
    tenant_id: self.tenantId,
    corp_code: SEOMDEULCHAE_CORP,
    business_unit: r.businessUnit,
    year_month: r.yearMonth,
    revenue: r.revenue,
    cogs: r.cogs,
    sga: r.sga,
    non_operating_income: r.nonOperatingIncome,
    non_operating_expense: r.nonOperatingExpense,
    uploaded_by: self.userId,
    file_name: file.name,
  }));

  const { error } = await supabase
    .from("executive_pl_business_unit")
    .upsert(rows, { onConflict: "tenant_id,corp_code,business_unit,year_month" });

  if (error) return { ok: false, message: "저장 중 오류가 발생했습니다." };

  revalidatePath("/admin/executive-targets");
  revalidatePath("/executive/pl");
  return { ok: true, recordCount: rows.length };
}

export async function getPlBusinessUnitUploadHistory(limit = 20): Promise<PlBusinessUnitUploadHistoryRow[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self || self.role !== "admin") return [];

  const { data } = await supabase
    .from("executive_pl_business_unit")
    .select("created_at, file_name, uploaded_by:profiles!uploaded_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (!data) return [];

  const byUpload = new Map<string, PlBusinessUnitUploadHistoryRow>();
  for (const row of data) {
    const uploader = Array.isArray(row.uploaded_by) ? row.uploaded_by[0] : row.uploaded_by;
    const key = `${row.created_at}|${row.file_name}`;
    const existing = byUpload.get(key);
    if (existing) {
      existing.row_count += 1;
    } else {
      byUpload.set(key, {
        created_at: row.created_at,
        file_name: row.file_name,
        uploaded_by_name: (uploader as { full_name: string | null } | null)?.full_name ?? null,
        row_count: 1,
      });
    }
  }

  return [...byUpload.values()].slice(0, limit);
}

export type BusinessUnitPL = {
  businessUnit: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number | null;
  sga: number;
  operatingProfit: number;
  operatingMarginPct: number | null;
  pretaxProfit: number;
};

function toBusinessUnitPL(businessUnit: string, revenue: number, cogs: number, sga: number, nonOpIncome: number, nonOpExpense: number): BusinessUnitPL {
  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit - sga;
  const pretaxProfit = operatingProfit + nonOpIncome - nonOpExpense;
  return {
    businessUnit,
    revenue,
    cogs,
    grossProfit,
    grossMarginPct: revenue !== 0 ? (grossProfit / revenue) * 100 : null,
    sga,
    operatingProfit,
    operatingMarginPct: revenue !== 0 ? (operatingProfit / revenue) * 100 : null,
    pretaxProfit,
  };
}

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  yearMonths: string[],
) {
  const { data } = await supabase
    .from("executive_pl_business_unit")
    .select("business_unit, year_month, revenue, cogs, sga, non_operating_income, non_operating_expense")
    .eq("tenant_id", tenantId)
    .eq("corp_code", SEOMDEULCHAE_CORP)
    .in("year_month", yearMonths);
  return data ?? [];
}

// 선택한 월의 부문별 손익 (없는 값은 0으로 취급해 합계가 어긋나지 않게 한다).
export async function getBusinessUnitBreakdown(yearMonth: string): Promise<BusinessUnitPL[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self || (self.role !== "admin" && self.team !== "임원실")) return [];

  const rows = await fetchRows(supabase, self.tenantId, [yearMonth]);
  return rows
    .map((r) =>
      toBusinessUnitPL(
        r.business_unit,
        r.revenue ?? 0,
        r.cogs ?? 0,
        r.sga ?? 0,
        r.non_operating_income ?? 0,
        r.non_operating_expense ?? 0,
      ),
    )
    .sort((a, b) => b.revenue - a.revenue);
}

// 연초~선택월 누계 부문별 손익.
export async function getBusinessUnitBreakdownYtd(yearMonth: string): Promise<BusinessUnitPL[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self || (self.role !== "admin" && self.team !== "임원실")) return [];

  const [year, month] = yearMonth.split("-").map(Number);
  const months = Array.from({ length: month }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const rows = await fetchRows(supabase, self.tenantId, months);

  const byUnit = new Map<string, { revenue: number; cogs: number; sga: number; nonOpIncome: number; nonOpExpense: number }>();
  for (const r of rows) {
    const entry = byUnit.get(r.business_unit) ?? { revenue: 0, cogs: 0, sga: 0, nonOpIncome: 0, nonOpExpense: 0 };
    entry.revenue += r.revenue ?? 0;
    entry.cogs += r.cogs ?? 0;
    entry.sga += r.sga ?? 0;
    entry.nonOpIncome += r.non_operating_income ?? 0;
    entry.nonOpExpense += r.non_operating_expense ?? 0;
    byUnit.set(r.business_unit, entry);
  }

  return [...byUnit.entries()]
    .map(([unit, v]) => toBusinessUnitPL(unit, v.revenue, v.cogs, v.sga, v.nonOpIncome, v.nonOpExpense))
    .sort((a, b) => b.revenue - a.revenue);
}

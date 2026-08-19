"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseSaltfieldProductionWorkbook, type SaltfieldFieldData } from "@/lib/saltfield/parse-production";

const MAX_SIZE = 15 * 1024 * 1024;

export type ProductionRecordListRow = {
  record_date: string;
  daily_total: number;
  file_name: string;
  uploaded_by_name: string | null;
};

export type ProductionRecordDetail = {
  record_date: string;
  daily_total: number;
  field_data: SaltfieldFieldData;
  weekly_plan: number | null;
  weekly_actual: number | null;
  plan_ratio: number | null;
  monthly_plan: number | null;
  monthly_actual: number | null;
  monthly_achievement_rate: number | null;
  monthly_cum_plan: number | null;
  monthly_cum_actual: number | null;
  monthly_cum_rate: number | null;
  annual_plan: number | null;
  annual_actual: number | null;
  annual_progress_rate: number | null;
};

export type ProductionSummary = {
  todayTotal: number | null;
  weeklyActual: number | null;
  weeklyPlan: number | null;
  monthlyAchievementRate: number | null;
  annualProgressRate: number | null;
};

export type UploadResult = { ok: true; recordCount: number } | { ok: false; message: string };

async function getSelf(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, team, role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    userId: user.id,
    tenantId: profile.tenant_id as string,
    team: profile.team as string,
    role: profile.role as string,
  };
}

function canManage(self: { team: string; role: string }): boolean {
  return self.role === "admin" || self.team === "염전관리팀";
}

export async function uploadProductionReport(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "파일을 선택하세요." };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, message: "파일 크기는 15MB 이하만 가능합니다." };
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return { ok: false, message: "엑셀(.xlsx) 파일만 업로드할 수 있습니다." };
  }

  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };
  if (!canManage(self)) return { ok: false, message: "업로드 권한이 없습니다." };

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let records;
  try {
    records = await parseSaltfieldProductionWorkbook(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "엑셀 파일을 읽는 중 오류가 발생했습니다.";
    return { ok: false, message };
  }
  if (records.length === 0) {
    return { ok: false, message: "파일에서 값이 채워진 날짜를 찾지 못했습니다." };
  }

  const rows = records.map((r) => ({
    tenant_id: self.tenantId,
    record_date: r.recordDate,
    daily_total: r.dailyTotal,
    field_data: r.fieldData,
    weekly_plan: r.weeklyPlan,
    weekly_actual: r.weeklyActual,
    plan_ratio: r.planRatio,
    monthly_plan: r.monthlyPlan,
    monthly_actual: r.monthlyActual,
    monthly_achievement_rate: r.monthlyAchievementRate,
    monthly_cum_plan: r.monthlyCumPlan,
    monthly_cum_actual: r.monthlyCumActual,
    monthly_cum_rate: r.monthlyCumRate,
    annual_plan: r.annualPlan,
    annual_actual: r.annualActual,
    annual_progress_rate: r.annualProgressRate,
    uploaded_by: self.userId,
    file_name: file.name,
  }));

  const { error } = await supabase
    .from("saltfield_production_records")
    .upsert(rows, { onConflict: "tenant_id,record_date" });

  if (error) return { ok: false, message: "저장 중 오류가 발생했습니다." };

  revalidatePath("/saltfield-production");
  return { ok: true, recordCount: rows.length };
}

export async function getProductionRecords(limit = 60): Promise<ProductionRecordListRow[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return [];

  const { data } = await supabase
    .from("saltfield_production_records")
    .select("record_date, daily_total, file_name, uploaded_by:profiles!uploaded_by(full_name)")
    .order("record_date", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => {
    const uploader = Array.isArray(r.uploaded_by) ? r.uploaded_by[0] : r.uploaded_by;
    return {
      record_date: r.record_date,
      daily_total: r.daily_total,
      file_name: r.file_name,
      uploaded_by_name: (uploader as { full_name: string | null } | null)?.full_name ?? null,
    };
  });
}

export async function getProductionSummary(): Promise<ProductionSummary> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { todayTotal: null, weeklyActual: null, weeklyPlan: null, monthlyAchievementRate: null, annualProgressRate: null };

  const { data } = await supabase
    .from("saltfield_production_records")
    .select("daily_total, weekly_actual, weekly_plan, monthly_achievement_rate, annual_progress_rate")
    .order("record_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { todayTotal: null, weeklyActual: null, weeklyPlan: null, monthlyAchievementRate: null, annualProgressRate: null };

  return {
    todayTotal: data.daily_total,
    weeklyActual: data.weekly_actual,
    weeklyPlan: data.weekly_plan,
    monthlyAchievementRate: data.monthly_achievement_rate,
    annualProgressRate: data.annual_progress_rate,
  };
}

export async function getProductionRecordDetail(date: string): Promise<ProductionRecordDetail | null> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return null;

  const { data } = await supabase
    .from("saltfield_production_records")
    .select(
      "record_date, daily_total, field_data, weekly_plan, weekly_actual, plan_ratio, monthly_plan, monthly_actual, monthly_achievement_rate, monthly_cum_plan, monthly_cum_actual, monthly_cum_rate, annual_plan, annual_actual, annual_progress_rate",
    )
    .eq("record_date", date)
    .maybeSingle();

  if (!data) return null;
  return data as ProductionRecordDetail;
}

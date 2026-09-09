"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseExecutiveTargetsWorkbook } from "@/lib/executive/parse-targets";
import { parseReportWorkbookTargets } from "@/lib/executive/parse-report-workbook-targets";

const MAX_SIZE = 15 * 1024 * 1024;
// 워크북 한 번에 과거 전체 기간(주+월)의 목표가 다 나오다 보니 행 수가 꽤 될 수 있어
// (수십 개 기간 × 여러 법인/업장), 요청 하나에 너무 많은 행을 보내지 않도록 나눠 올린다.
const UPSERT_CHUNK_SIZE = 500;

export type UploadResult = { ok: true; recordCount: number } | { ok: false; message: string; errors?: string[] };
export type UploadWorkbookResult =
  | { ok: true; recordCount: number; asOfDate: string }
  | { ok: false; message: string; errors?: string[] };

export type TargetUploadHistoryRow = {
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

  const { data: profile } = await supabase.from("profiles").select("tenant_id, role").eq("id", user.id).single();
  if (!profile) return null;

  return { userId: user.id, tenantId: profile.tenant_id as string, role: profile.role as string };
}

export async function uploadTargets(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "파일을 선택하세요." };
  if (file.size > MAX_SIZE) return { ok: false, message: "파일 크기는 15MB 이하만 가능합니다." };
  if (!/\.xlsx$/i.test(file.name)) return { ok: false, message: "엑셀(.xlsx) 파일만 업로드할 수 있습니다." };

  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };
  if (self.role !== "admin") return { ok: false, message: "업로드 권한이 없습니다." };

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseExecutiveTargetsWorkbook(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "엑셀 파일을 읽는 중 오류가 발생했습니다.";
    return { ok: false, message };
  }
  if (!parsed.ok) return { ok: false, message: `업로드 실패 (${parsed.errors.length}건 오류)`, errors: parsed.errors };

  const rows = parsed.rows.map((r) => ({
    tenant_id: self.tenantId,
    metric: r.metric,
    corp_code: r.corpCode,
    category: r.category,
    period_type: r.periodType,
    period_key: r.periodKey,
    target_value: r.targetValue,
    uploaded_by: self.userId,
    file_name: file.name,
  }));

  const { error } = await supabase
    .from("executive_targets")
    .upsert(rows, { onConflict: "tenant_id,metric,corp_code,category,period_type,period_key" });

  if (error) return { ok: false, message: "저장 중 오류가 발생했습니다." };

  revalidatePath("/admin/executive-targets");
  revalidatePath("/executive/report");
  return { ok: true, recordCount: rows.length };
}

export async function getTargetUploadHistory(limit = 20): Promise<TargetUploadHistoryRow[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self || self.role !== "admin") return [];

  const { data } = await supabase
    .from("executive_targets")
    .select("created_at, file_name, uploaded_by:profiles!uploaded_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data) return [];

  const byUpload = new Map<string, TargetUploadHistoryRow>();
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

// "주간_월간_업무보고" 워크북을 그대로 업로드하면, 태평소금/태평염전/박물관 매출목표(주간+월간),
// 태평소금·태평염전 생산목표(월간)는 executive_targets에, 섬들채 업장별 목표·실적 스냅샷은
// executive_seomdeulchae_unit_report에 반영한다.
export async function uploadExecutiveTargetsFromWorkbook(formData: FormData): Promise<UploadWorkbookResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "파일을 선택하세요." };
  if (file.size > MAX_SIZE) return { ok: false, message: "파일 크기는 15MB 이하만 가능합니다." };
  if (!/\.xlsx$/i.test(file.name)) return { ok: false, message: "엑셀(.xlsx) 파일만 업로드할 수 있습니다." };

  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };
  if (self.role !== "admin") return { ok: false, message: "업로드 권한이 없습니다." };

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseReportWorkbookTargets(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "엑셀 파일을 읽는 중 오류가 발생했습니다.";
    return { ok: false, message };
  }
  if (!parsed.ok) return { ok: false, message: `업로드 실패 (${parsed.errors.length}건 오류)`, errors: parsed.errors };

  // 워크북 안에 있던 모든 주/월의 목표를 한꺼번에 올린다(마감일자 하루치가 아니라
  // 워크북에 실제로 채워져 있던 과거 전체 기간) — 그래야 과거 특정 주를 조회해도 그 주의
  // 목표가 나온다.
  const targetRows: {
    tenant_id: string;
    metric: "sales" | "production";
    corp_code: string | null;
    category: string | null;
    period_type: "week" | "month";
    period_key: string;
    target_value: number;
    uploaded_by: string;
    file_name: string;
  }[] = [];

  for (const t of parsed.corpTargets) {
    for (const { periodKey, value } of t.weekPlans) {
      targetRows.push({
        tenant_id: self.tenantId,
        metric: "sales",
        corp_code: t.corpCode,
        category: null,
        period_type: "week",
        period_key: periodKey,
        target_value: value,
        uploaded_by: self.userId,
        file_name: file.name,
      });
    }
    for (const { periodKey, value } of t.monthPlans) {
      targetRows.push({
        tenant_id: self.tenantId,
        metric: "sales",
        corp_code: t.corpCode,
        category: null,
        period_type: "month",
        period_key: periodKey,
        target_value: value,
        uploaded_by: self.userId,
        file_name: file.name,
      });
    }
  }
  for (const p of parsed.productionTargets) {
    targetRows.push({
      tenant_id: self.tenantId,
      metric: "production",
      corp_code: p.corpCode,
      category: p.category,
      period_type: "month",
      period_key: p.periodKey,
      target_value: p.targetValue,
      uploaded_by: self.userId,
      file_name: file.name,
    });
  }

  for (let i = 0; i < targetRows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = targetRows.slice(i, i + UPSERT_CHUNK_SIZE);
    const { error } = await supabase
      .from("executive_targets")
      .upsert(chunk, { onConflict: "tenant_id,metric,corp_code,category,period_type,period_key" });
    if (error) return { ok: false, message: "매출/생산 목표 저장 중 오류가 발생했습니다." };
  }

  // 섬들채 업장별(6개 실제 업장) 목표도 워크북에 있던 모든 주/월을 한꺼번에 올린다.
  const unitRows: {
    tenant_id: string;
    business_unit: string;
    period_type: "week" | "month";
    period_key: string;
    target_value: number;
    uploaded_by: string;
    file_name: string;
  }[] = [];
  for (const u of parsed.seomdeulchaeUnits) {
    for (const { periodKey, value } of u.weekPlans) {
      unitRows.push({
        tenant_id: self.tenantId,
        business_unit: u.businessUnit,
        period_type: "week",
        period_key: periodKey,
        target_value: value,
        uploaded_by: self.userId,
        file_name: file.name,
      });
    }
    for (const { periodKey, value } of u.monthPlans) {
      unitRows.push({
        tenant_id: self.tenantId,
        business_unit: u.businessUnit,
        period_type: "month",
        period_key: periodKey,
        target_value: value,
        uploaded_by: self.userId,
        file_name: file.name,
      });
    }
  }

  for (let i = 0; i < unitRows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = unitRows.slice(i, i + UPSERT_CHUNK_SIZE);
    const { error } = await supabase
      .from("executive_seomdeulchae_unit_target")
      .upsert(chunk, { onConflict: "tenant_id,business_unit,period_type,period_key" });
    if (error) return { ok: false, message: "섬들채 업장별 목표 저장 중 오류가 발생했습니다." };
  }

  revalidatePath("/admin/executive-targets");
  revalidatePath("/executive/report");
  return { ok: true, recordCount: targetRows.length + unitRows.length, asOfDate: parsed.asOfDate };
}

export type WorkbookUploadHistoryRow = {
  as_of_date: string;
  created_at: string;
  file_name: string | null;
  uploaded_by_name: string | null;
  row_count: number;
};

export async function getWorkbookUploadHistory(limit = 20): Promise<WorkbookUploadHistoryRow[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self || self.role !== "admin") return [];

  const { data } = await supabase
    .from("executive_seomdeulchae_unit_report")
    .select("as_of_date, created_at, file_name, uploaded_by:profiles!uploaded_by(full_name)")
    .order("as_of_date", { ascending: false })
    .limit(200);

  if (!data) return [];

  const byUpload = new Map<string, WorkbookUploadHistoryRow>();
  for (const row of data) {
    const uploader = Array.isArray(row.uploaded_by) ? row.uploaded_by[0] : row.uploaded_by;
    const existing = byUpload.get(row.as_of_date);
    if (existing) {
      existing.row_count += 1;
    } else {
      byUpload.set(row.as_of_date, {
        as_of_date: row.as_of_date,
        created_at: row.created_at,
        file_name: row.file_name,
        uploaded_by_name: (uploader as { full_name: string | null } | null)?.full_name ?? null,
        row_count: 1,
      });
    }
  }

  return [...byUpload.values()].slice(0, limit);
}

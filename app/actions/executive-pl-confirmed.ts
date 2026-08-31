"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parsePlConfirmedWorkbook } from "@/lib/executive/parse-pl-confirmed";

const MAX_SIZE = 15 * 1024 * 1024;

export type UploadResult = { ok: true; recordCount: number } | { ok: false; message: string; errors?: string[] };

export type PlConfirmedUploadHistoryRow = {
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

export async function uploadPlConfirmed(formData: FormData): Promise<UploadResult> {
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
    parsed = await parsePlConfirmedWorkbook(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "엑셀 파일을 읽는 중 오류가 발생했습니다.";
    return { ok: false, message };
  }
  if (!parsed.ok) return { ok: false, message: `업로드 실패 (${parsed.errors.length}건 오류)`, errors: parsed.errors };

  const rows = parsed.rows.map((r) => ({
    tenant_id: self.tenantId,
    corp_code: r.corpCode,
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
    .from("executive_pl_confirmed")
    .upsert(rows, { onConflict: "tenant_id,corp_code,year_month" });

  if (error) return { ok: false, message: "저장 중 오류가 발생했습니다." };

  revalidatePath("/admin/executive-targets");
  revalidatePath("/executive/pl");
  return { ok: true, recordCount: rows.length };
}

export async function getPlConfirmedUploadHistory(limit = 20): Promise<PlConfirmedUploadHistoryRow[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self || self.role !== "admin") return [];

  const { data } = await supabase
    .from("executive_pl_confirmed")
    .select("created_at, file_name, uploaded_by:profiles!uploaded_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data) return [];

  const byUpload = new Map<string, PlConfirmedUploadHistoryRow>();
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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseExecutiveTargetsWorkbook } from "@/lib/executive/parse-targets";

const MAX_SIZE = 15 * 1024 * 1024;

export type UploadResult = { ok: true; recordCount: number } | { ok: false; message: string; errors?: string[] };

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

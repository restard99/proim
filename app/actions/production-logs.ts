"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseProductionLogWorkbook, type ProductionLogSheet } from "@/lib/production-logs/parse";

const BUCKET = "production-logs";
const MAX_SIZE = 15 * 1024 * 1024;

export type ProductionLogListRow = {
  id: string;
  period_label: string;
  file_name: string;
  uploaded_by_name: string | null;
  uploaded_by: string;
  created_at: string;
};

export type ProductionLogDetail = {
  id: string;
  period_label: string;
  file_name: string;
  file_path: string;
  sheets: ProductionLogSheet[];
};

export type UploadResult = { ok: true; id: string } | { ok: false; message: string };
export type SaveResult = { ok: true } | { ok: false; message: string };

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

function canUpload(self: { team: string; role: string }): boolean {
  return self.role === "admin" || self.team === "생산팀";
}

// 파일명에서 "26년 1월"/"2026년1월" 형태의 기간을 뽑아 "2026년 1월"로 정규화한다.
// 못 찾으면 업로드 시점의 년/월로 대체한다.
function extractPeriodLabel(fileName: string): string {
  const match = fileName.match(/(\d{2,4})\s*년\s*(\d{1,2})\s*월/);
  if (match) {
    const yearStr = match[1];
    const year = yearStr.length === 2 ? 2000 + Number(yearStr) : Number(yearStr);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return `${year}년 ${month}월`;
  }
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
}

export async function uploadProductionLog(formData: FormData): Promise<UploadResult> {
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
  if (!canUpload(self)) {
    return { ok: false, message: "업로드 권한이 없습니다." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let sheets: ProductionLogSheet[];
  try {
    sheets = await parseProductionLogWorkbook(buffer);
  } catch {
    return { ok: false, message: "엑셀 파일을 읽는 중 오류가 발생했습니다." };
  }
  if (sheets.length === 0 || sheets.every((s) => s.rows.length === 0)) {
    return { ok: false, message: "파일에서 데이터를 찾지 못했습니다. 양식을 확인해주세요." };
  }

  const path = `${self.userId}/${Date.now()}-${crypto.randomUUID()}.xlsx`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  if (uploadError) return { ok: false, message: "파일 업로드 중 오류가 발생했습니다." };

  const { data, error } = await supabase
    .from("production_logs")
    .insert({
      tenant_id: self.tenantId,
      uploaded_by: self.userId,
      team: self.team,
      period_label: extractPeriodLabel(file.name),
      file_path: path,
      file_name: file.name,
      sheets,
    })
    .select("id")
    .single();

  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, message: "저장 중 오류가 발생했습니다." };
  }

  revalidatePath("/production-logs");
  return { ok: true, id: data.id };
}

export async function getProductionLogList(limit = 30): Promise<ProductionLogListRow[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return [];

  const { data } = await supabase
    .from("production_logs")
    .select("id, period_label, file_name, uploaded_by, created_at, uploader:profiles!uploaded_by(full_name)")
    .order("period_label", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => {
    const uploader = Array.isArray(r.uploader) ? r.uploader[0] : r.uploader;
    return {
      id: r.id,
      period_label: r.period_label,
      file_name: r.file_name,
      uploaded_by: r.uploaded_by,
      uploaded_by_name: (uploader as { full_name: string | null } | null)?.full_name ?? null,
      created_at: r.created_at,
    };
  });
}

export async function getProductionLogDetail(id: string): Promise<ProductionLogDetail | null> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return null;

  const { data } = await supabase
    .from("production_logs")
    .select("id, period_label, file_name, file_path, sheets")
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    period_label: data.period_label,
    file_name: data.file_name,
    file_path: data.file_path,
    sheets: (data.sheets ?? []) as ProductionLogSheet[],
  };
}

export async function getProductionLogFileUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteProductionLog(id: string): Promise<SaveResult> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };

  const { data: row } = await supabase
    .from("production_logs")
    .select("file_path, uploaded_by")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, message: "삭제할 항목을 찾을 수 없습니다." };
  if (row.uploaded_by !== self.userId && self.role !== "admin") {
    return { ok: false, message: "삭제 권한이 없습니다." };
  }

  const { error } = await supabase.from("production_logs").delete().eq("id", id);
  if (error) return { ok: false, message: "삭제 중 오류가 발생했습니다." };

  await supabase.storage.from(BUCKET).remove([row.file_path]);

  revalidatePath("/production-logs");
  return { ok: true };
}

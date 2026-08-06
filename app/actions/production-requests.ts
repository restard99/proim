"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  parseProductionRequestWorkbook,
  type ProductionRequestItem,
  type ProductionRequestSubItem,
  type ProductionRequestTotals,
} from "@/lib/production-requests/parse";

const BUCKET = "production-requests";
const MAX_SIZE = 15 * 1024 * 1024;

export type ProductionRequestListRow = {
  id: string;
  request_date: string;
  file_name: string;
  uploaded_by_name: string | null;
  created_at: string;
};

export type ProductionRequestDetail = {
  id: string;
  request_date: string;
  file_name: string;
  file_path: string;
  items: ProductionRequestItem[];
  sub_items: ProductionRequestSubItem[];
  totals: ProductionRequestTotals | null;
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

export async function uploadProductionRequest(requestDate: string, formData: FormData): Promise<UploadResult> {
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
  if (self.role !== "admin" && !(self.team === "영업채산팀" && self.role === "leader")) {
    return { ok: false, message: "업로드 권한이 없습니다." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let parsed;
  try {
    parsed = await parseProductionRequestWorkbook(buffer);
  } catch {
    return { ok: false, message: "엑셀 파일을 읽는 중 오류가 발생했습니다." };
  }
  if (parsed.items.length === 0) {
    return { ok: false, message: "파일에서 제품 항목을 찾지 못했습니다. 양식을 확인해주세요." };
  }

  const path = `${self.userId}/${Date.now()}-${crypto.randomUUID()}.xlsx`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  if (uploadError) return { ok: false, message: "파일 업로드 중 오류가 발생했습니다." };

  const { data, error } = await supabase
    .from("production_requests")
    .insert({
      tenant_id: self.tenantId,
      uploaded_by: self.userId,
      team: self.team,
      request_date: requestDate,
      file_path: path,
      file_name: file.name,
      items: parsed.items,
      sub_items: parsed.subItems,
      totals: parsed.totals,
    })
    .select("id")
    .single();

  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, message: "저장 중 오류가 발생했습니다." };
  }

  revalidatePath("/inventory");
  return { ok: true, id: data.id };
}

export async function getProductionRequestList(limit = 30): Promise<ProductionRequestListRow[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return [];

  const { data } = await supabase
    .from("production_requests")
    .select("id, request_date, file_name, created_at, uploaded_by:profiles!uploaded_by(full_name)")
    .order("request_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => {
    const uploader = Array.isArray(r.uploaded_by) ? r.uploaded_by[0] : r.uploaded_by;
    return {
      id: r.id,
      request_date: r.request_date,
      file_name: r.file_name,
      uploaded_by_name: (uploader as { full_name: string | null } | null)?.full_name ?? null,
      created_at: r.created_at,
    };
  });
}

export async function getProductionRequestDetail(id: string): Promise<ProductionRequestDetail | null> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return null;

  const { data } = await supabase
    .from("production_requests")
    .select("id, request_date, file_name, file_path, items, sub_items, totals")
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    request_date: data.request_date,
    file_name: data.file_name,
    file_path: data.file_path,
    items: data.items ?? [],
    sub_items: data.sub_items ?? [],
    totals: data.totals ?? null,
  };
}

export async function getProductionRequestFileUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteProductionRequest(id: string): Promise<SaveResult> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };

  const { data: row } = await supabase
    .from("production_requests")
    .select("file_path, uploaded_by")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, message: "삭제할 항목을 찾을 수 없습니다." };
  if (row.uploaded_by !== self.userId && self.role !== "admin") {
    return { ok: false, message: "삭제 권한이 없습니다." };
  }

  const { error } = await supabase.from("production_requests").delete().eq("id", id);
  if (error) return { ok: false, message: "삭제 중 오류가 발생했습니다." };

  await supabase.storage.from(BUCKET).remove([row.file_path]);

  revalidatePath("/inventory");
  return { ok: true };
}

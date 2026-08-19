"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseSaltfieldMaterialsWorkbook } from "@/lib/saltfield/parse-materials";

const MAX_SIZE = 15 * 1024 * 1024;

export type MaterialRow = {
  month_label: string;
  vendor_name: string;
  item_name: string;
  unit_price: number | null;
  carryover_qty: number | null;
  inbound_qty: number | null;
  outbound_qty: number | null;
  stock_qty: number | null;
  stock_value: number | null;
  note: string | null;
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

export async function uploadMaterialInventory(formData: FormData): Promise<UploadResult> {
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

  let parsed;
  try {
    parsed = await parseSaltfieldMaterialsWorkbook(buffer);
  } catch {
    return { ok: false, message: "엑셀 파일을 읽는 중 오류가 발생했습니다." };
  }
  if (parsed.length === 0) {
    return { ok: false, message: "파일에서 품목을 찾지 못했습니다. 양식을 확인해주세요." };
  }

  const rows = parsed.map((r) => ({
    tenant_id: self.tenantId,
    month_label: r.monthLabel,
    vendor_name: r.vendorName,
    item_name: r.itemName,
    unit_price: r.unitPrice,
    carryover_qty: r.carryoverQty,
    inbound_qty: r.inboundQty,
    outbound_qty: r.outboundQty,
    stock_qty: r.stockQty,
    stock_value: r.stockValue,
    note: r.note,
    uploaded_by: self.userId,
  }));

  // "최신 파일로 교체" — 기존 테넌트 데이터를 지우고 새로 삽입한다.
  const { error: deleteError } = await supabase
    .from("saltfield_materials")
    .delete()
    .eq("tenant_id", self.tenantId);
  if (deleteError) return { ok: false, message: "기존 데이터 삭제 중 오류가 발생했습니다." };

  const { error: insertError } = await supabase.from("saltfield_materials").insert(rows);
  if (insertError) return { ok: false, message: "저장 중 오류가 발생했습니다." };

  revalidatePath("/saltfield-inventory");
  return { ok: true, recordCount: rows.length };
}

export async function getMaterialInventory(monthLabel?: string): Promise<MaterialRow[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return [];

  let query = supabase
    .from("saltfield_materials")
    .select("month_label, vendor_name, item_name, unit_price, carryover_qty, inbound_qty, outbound_qty, stock_qty, stock_value, note")
    .order("vendor_name", { ascending: true })
    .order("item_name", { ascending: true });

  if (monthLabel) query = query.eq("month_label", monthLabel);

  const { data } = await query;
  return (data ?? []) as MaterialRow[];
}

export async function getMaterialMonths(): Promise<string[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return [];

  const { data } = await supabase.from("saltfield_materials").select("month_label");
  const months = [...new Set((data ?? []).map((r) => r.month_label as string))];
  return months.sort((a, b) => parseInt(a) - parseInt(b));
}

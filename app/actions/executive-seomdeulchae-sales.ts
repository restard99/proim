"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseSeomdeulchaeSalesRawWorkbook } from "@/lib/executive/parse-seomdeulchae-sales-raw";
import { canUploadSeomdeulchaeSales } from "@/components/layout/nav-items";
import { getGrantedHrefs } from "@/lib/auth/menu-access";

const MAX_SIZE = 15 * 1024 * 1024;
// Supabase/PostgREST 요청 하나에 너무 많은 행을 한 번에 보내면 타임아웃/실패 위험이 있어
// 나눠서 올린다. 같은 (날짜,업장,상품코드)는 upsert라 겹치는 기간을 다시 올려도 안전하다.
const CHUNK_SIZE = 500;

export type UploadSalesRawResult =
  | { ok: true; recordCount: number; dateRange: { start: string; end: string } }
  | { ok: false; message: string; errors?: string[] };

export type SalesRawSummary = {
  rowCount: number;
  minDate: string | null;
  maxDate: string | null;
  lastUploadedAt: string | null;
};

async function getSelf(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("tenant_id, team, role").eq("id", user.id).single();
  if (!profile) return null;

  return {
    userId: user.id,
    tenantId: profile.tenant_id as string,
    team: profile.team as string,
    role: profile.role as string,
  };
}

export async function uploadSeomdeulchaeSalesRaw(formData: FormData): Promise<UploadSalesRawResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "파일을 선택하세요." };
  if (file.size > MAX_SIZE) return { ok: false, message: "파일 크기는 15MB 이하만 가능합니다." };
  if (!/\.xlsx?$/i.test(file.name)) return { ok: false, message: "엑셀(.xls/.xlsx) 파일만 업로드할 수 있습니다." };

  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };

  const grantedHrefs = await getGrantedHrefs(supabase, self.userId);
  if (!canUploadSeomdeulchaeSales(self.team, self.role) && !grantedHrefs.has("/executive/sales-upload")) {
    return { ok: false, message: "업로드 권한이 없습니다." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = parseSeomdeulchaeSalesRawWorkbook(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "엑셀 파일을 읽는 중 오류가 발생했습니다.";
    return { ok: false, message };
  }
  if (!parsed.ok) return { ok: false, message: `업로드 실패 (${parsed.errors.length}건 오류)`, errors: parsed.errors };

  const rows = parsed.rows.map((r) => ({
    tenant_id: self.tenantId,
    sale_date: r.saleDate,
    corp_code: r.corpCode,
    business_unit: r.businessUnit,
    product_code: r.productCode,
    product_name: r.productName,
    qty: r.qty,
    gross_amount: r.grossAmount,
    discount_amount: r.discountAmount,
    net_amount: r.netAmount,
    uploaded_by: self.userId,
    file_name: file.name,
  }));

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from("executive_seomdeulchae_sales_raw")
      .upsert(chunk, { onConflict: "tenant_id,sale_date,business_unit,product_code" });
    if (error) {
      return { ok: false, message: `저장 중 오류가 발생했습니다 (${i + 1}~${i + chunk.length}행 처리 중).` };
    }
  }

  const dates = parsed.rows.map((r) => r.saleDate).sort();

  revalidatePath("/admin/executive-targets");
  revalidatePath("/executive/sales-upload");
  revalidatePath("/executive/report");
  return { ok: true, recordCount: rows.length, dateRange: { start: dates[0], end: dates[dates.length - 1] } };
}

export async function getSeomdeulchaeSalesRawSummary(): Promise<SalesRawSummary> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  const empty: SalesRawSummary = { rowCount: 0, minDate: null, maxDate: null, lastUploadedAt: null };
  if (!self) return empty;

  const grantedHrefs = await getGrantedHrefs(supabase, self.userId);
  if (!canUploadSeomdeulchaeSales(self.team, self.role) && !grantedHrefs.has("/executive/sales-upload")) return empty;

  const { count } = await supabase
    .from("executive_seomdeulchae_sales_raw")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", self.tenantId);

  if (!count) return empty;

  const [{ data: minRow }, { data: maxRow }, { data: lastRow }] = await Promise.all([
    supabase
      .from("executive_seomdeulchae_sales_raw")
      .select("sale_date")
      .eq("tenant_id", self.tenantId)
      .order("sale_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("executive_seomdeulchae_sales_raw")
      .select("sale_date")
      .eq("tenant_id", self.tenantId)
      .order("sale_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("executive_seomdeulchae_sales_raw")
      .select("created_at")
      .eq("tenant_id", self.tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    rowCount: count,
    minDate: minRow?.sale_date ?? null,
    maxDate: maxRow?.sale_date ?? null,
    lastUploadedAt: lastRow?.created_at ?? null,
  };
}

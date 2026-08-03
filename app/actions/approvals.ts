"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ApprovalResult = { ok: true } | { ok: false; message: string };

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function approveUser(profileId: string): Promise<ApprovalResult> {
  const supabase = await createClient();
  const admin = await assertAdmin(supabase);
  if (!admin) return { ok: false, message: "권한이 없습니다." };

  const { error } = await supabase
    .from("profiles")
    .update({ status: "approved", approved_by: admin.id, approved_at: new Date().toISOString() })
    .eq("id", profileId);

  if (error) return { ok: false, message: "승인 처리 중 오류가 발생했습니다." };

  revalidatePath("/admin/approvals");
  return { ok: true };
}

export async function rejectUser(profileId: string): Promise<ApprovalResult> {
  const supabase = await createClient();
  const admin = await assertAdmin(supabase);
  if (!admin) return { ok: false, message: "권한이 없습니다." };

  const { error } = await supabase.from("profiles").update({ status: "rejected" }).eq("id", profileId);

  if (error) return { ok: false, message: "반려 처리 중 오류가 발생했습니다." };

  revalidatePath("/admin/approvals");
  return { ok: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUserRow = {
  id: string;
  full_name: string;
  team: string;
  role: string;
  status: string;
  email: string | null;
  created_at: string;
};

export type ListUsersResult = { ok: true; users: AdminUserRow[] } | { ok: false; message: string };

export type ResetPasswordResult =
  | { ok: true; tempPassword: string }
  | { ok: false; message: string };

export type UpdateEmailResult = { ok: true } | { ok: false; message: string };

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function listAllUsers(): Promise<ListUsersResult> {
  const supabase = await createClient();
  const admin = await assertAdmin(supabase);
  if (!admin) return { ok: false, message: "권한이 없습니다." };

  const tenantId = process.env.DEFAULT_TENANT_ID!;
  const { data, error } = await supabase.rpc("admin_list_users", { p_tenant_id: tenantId });
  if (error) return { ok: false, message: "사용자 목록을 불러오지 못했습니다." };

  return { ok: true, users: (data ?? []) as AdminUserRow[] };
}

export async function resetUserPassword(profileId: string): Promise<ResetPasswordResult> {
  const supabase = await createClient();
  const admin = await assertAdmin(supabase);
  if (!admin) return { ok: false, message: "권한이 없습니다." };

  const tempPassword = generateTempPassword();
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(profileId, { password: tempPassword });
  if (error) return { ok: false, message: "비밀번호 재설정 중 오류가 발생했습니다." };

  return { ok: true, tempPassword };
}

export async function updateUserEmail(profileId: string, newEmail: string): Promise<UpdateEmailResult> {
  const supabase = await createClient();
  const admin = await assertAdmin(supabase);
  if (!admin) return { ok: false, message: "권한이 없습니다." };

  const email = newEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "올바른 이메일 형식이 아닙니다." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(profileId, { email, email_confirm: true });
  if (error) {
    if (error.code === "email_exists") {
      return { ok: false, message: "이미 사용 중인 이메일입니다." };
    }
    return { ok: false, message: "이메일 변경 중 오류가 발생했습니다." };
  }

  return { ok: true };
}

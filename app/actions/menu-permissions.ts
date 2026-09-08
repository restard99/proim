"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GRANTABLE_MENU_ITEMS } from "@/components/layout/nav-items";

export type GrantableUser = {
  id: string;
  full_name: string;
  team: string;
  role: string;
};

export type ListGrantableUsersResult = { ok: true; users: GrantableUser[] } | { ok: false; message: string };
export type GetGrantsResult = { ok: true; hrefs: string[] } | { ok: false; message: string };
export type SetGrantResult = { ok: true } | { ok: false; message: string };

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role, tenant_id").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return { userId: user.id, tenantId: profile.tenant_id as string };
}

// 관리자 자신은 이미 모든 메뉴가 보이고, 미승인 계정은 아직 메뉴 접근 자체가 막혀 있어
// 개인별 권한을 부여할 대상에서 제외한다.
export async function getGrantableUsers(): Promise<ListGrantableUsersResult> {
  const supabase = await createClient();
  const admin = await assertAdmin(supabase);
  if (!admin) return { ok: false, message: "권한이 없습니다." };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, team, role")
    .eq("status", "approved")
    .neq("role", "admin")
    .order("full_name", { ascending: true });

  if (error) return { ok: false, message: "사용자 목록을 불러오지 못했습니다." };
  return { ok: true, users: (data ?? []) as GrantableUser[] };
}

export async function getUserMenuGrants(userId: string): Promise<GetGrantsResult> {
  const supabase = await createClient();
  const admin = await assertAdmin(supabase);
  if (!admin) return { ok: false, message: "권한이 없습니다." };

  const { data, error } = await supabase.from("user_menu_grants").select("menu_href").eq("user_id", userId);
  if (error) return { ok: false, message: "권한 목록을 불러오지 못했습니다." };
  return { ok: true, hrefs: (data ?? []).map((r) => r.menu_href as string) };
}

export async function setUserMenuGrant(userId: string, href: string, granted: boolean): Promise<SetGrantResult> {
  const supabase = await createClient();
  const admin = await assertAdmin(supabase);
  if (!admin) return { ok: false, message: "권한이 없습니다." };

  if (!GRANTABLE_MENU_ITEMS.some((e) => e.item.href === href)) {
    return { ok: false, message: "부여할 수 없는 메뉴입니다." };
  }

  if (granted) {
    const { error } = await supabase.from("user_menu_grants").insert({
      tenant_id: admin.tenantId,
      user_id: userId,
      menu_href: href,
      granted_by: admin.userId,
    });
    // 이미 부여돼 있으면(UNIQUE 제약 충돌) 그대로 성공 처리한다.
    if (error && error.code !== "23505") return { ok: false, message: "저장 중 오류가 발생했습니다." };
  } else {
    const { error } = await supabase
      .from("user_menu_grants")
      .delete()
      .eq("user_id", userId)
      .eq("menu_href", href);
    if (error) return { ok: false, message: "저장 중 오류가 발생했습니다." };
  }

  revalidatePath("/admin/approvals");
  return { ok: true };
}

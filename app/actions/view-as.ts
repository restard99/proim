"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VIEW_AS_COOKIE = "admin_view_as_session";

type StoredSession = { access_token: string; refresh_token: string };

export type StartViewAsResult = { ok: true } | { ok: false; message: string };

export async function startViewAs(targetProfileId: string): Promise<StartViewAsResult> {
  const cookieStore = await cookies();
  if (cookieStore.get(VIEW_AS_COOKIE)) {
    return { ok: false, message: "먼저 관리자로 복귀해주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "권한이 없습니다." };

  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (adminProfile?.role !== "admin") return { ok: false, message: "권한이 없습니다." };

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", targetProfileId)
    .single();
  if (!target || target.role === "admin" || target.status !== "approved") {
    return { ok: false, message: "전환할 수 없는 계정입니다." };
  }

  const adminClient = createAdminClient();
  const { data: targetAuthUser, error: getUserError } = await adminClient.auth.admin.getUserById(targetProfileId);
  if (getUserError || !targetAuthUser?.user?.email) {
    return { ok: false, message: "대상 계정 정보를 확인하지 못했습니다." };
  }

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: targetAuthUser.user.email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    return { ok: false, message: "전환 토큰 발급에 실패했습니다." };
  }

  const anonClient = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: otpData, error: otpError } = await anonClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (otpError || !otpData?.session) {
    return { ok: false, message: "계정 전환에 실패했습니다." };
  }

  const { data: currentSession } = await supabase.auth.getSession();
  if (!currentSession?.session) {
    return { ok: false, message: "관리자 세션을 확인하지 못했습니다." };
  }

  const storedAdminSession: StoredSession = {
    access_token: currentSession.session.access_token,
    refresh_token: currentSession.session.refresh_token,
  };
  cookieStore.set(VIEW_AS_COOKIE, JSON.stringify(storedAdminSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  await supabase.auth.setSession({
    access_token: otpData.session.access_token,
    refresh_token: otpData.session.refresh_token,
  });

  redirect("/");
}

export async function stopViewAs(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(VIEW_AS_COOKIE)?.value;

  if (raw) {
    let stored: StoredSession | null = null;
    try {
      stored = JSON.parse(raw) as StoredSession;
    } catch {
      stored = null;
    }

    cookieStore.delete(VIEW_AS_COOKIE);

    if (stored) {
      const supabase = await createClient();
      await supabase.auth.setSession(stored);
    }
  }

  redirect("/admin/view-as");
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TEAMS, SIGNUP_ROLES } from "@/lib/auth/constants";

export type SignUpFieldErrors = Partial<
  Record<"fullName" | "team" | "role" | "password" | "passwordConfirm", string>
>;

export type SignUpState =
  | { status: "idle" }
  | { status: "error"; error: "validation"; fieldErrors: SignUpFieldErrors }
  | { status: "error"; error: "duplicate-name" }
  | { status: "error"; error: "unknown"; message: string };

const SIGNUP_ROLE_VALUES = SIGNUP_ROLES.map((r) => r.value);

export async function signUp(_prevState: SignUpState, formData: FormData): Promise<SignUpState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const team = String(formData.get("team") ?? "");
  const role = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  const fieldErrors: SignUpFieldErrors = {};
  if (!fullName) fieldErrors.fullName = "이름을 입력하세요.";
  if (!TEAMS.includes(team as (typeof TEAMS)[number])) fieldErrors.team = "소속팀을 선택하세요.";
  if (!SIGNUP_ROLE_VALUES.includes(role as (typeof SIGNUP_ROLE_VALUES)[number])) {
    fieldErrors.role = "직급을 선택하세요.";
  }
  if (password.length < 8) fieldErrors.password = "비밀번호는 8자 이상이어야 합니다.";
  if (password !== passwordConfirm) fieldErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", error: "validation", fieldErrors };
  }

  const supabase = await createClient();
  const tenantId = process.env.DEFAULT_TENANT_ID!;

  const { data: taken } = await supabase.rpc("profile_name_team_taken", {
    p_tenant_id: tenantId,
    p_full_name: fullName,
    p_team: team,
  });
  if (taken) {
    return { status: "error", error: "duplicate-name" };
  }

  const syntheticEmail = `${crypto.randomUUID()}@internal.taepyeong.invalid`;
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: syntheticEmail,
    password,
  });
  if (signUpError || !signUpData.user) {
    return { status: "error", error: "unknown", message: "가입 처리 중 오류가 발생했습니다." };
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: signUpData.user.id,
    tenant_id: tenantId,
    full_name: fullName,
    team,
    role,
    status: "pending",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { status: "error", error: "duplicate-name" };
    }
    return { status: "error", error: "unknown", message: "가입 처리 중 오류가 발생했습니다." };
  }

  redirect("/pending");
}

export type SignInFieldErrors = Partial<Record<"fullName" | "team" | "password", string>>;

export type SignInState =
  | { status: "idle" }
  | { status: "error"; error: "validation"; fieldErrors: SignInFieldErrors }
  | { status: "error"; error: "invalid-credentials" }
  | { status: "error"; error: "pending-approval" };

// 관리자는 소속팀이 없어 이름+소속팀 조합으로 계정을 특정할 수 없다.
// "이름" 입력값에 이메일을 그대로 입력하면(관리자가 Supabase 대시보드에서
// 직접 만든 실제 이메일) 소속팀 없이 그 이메일로 바로 로그인할 수 있게 한다.
// 일반 직원은 이름+소속팀 조합으로만 로그인하므로 이 경로와 섞이지 않는다.
function isEmailLike(value: string) {
  return value.includes("@");
}

export async function signIn(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const team = String(formData.get("team") ?? "");
  const password = String(formData.get("password") ?? "");
  const isAdminEmailLogin = isEmailLike(fullName);

  const fieldErrors: SignInFieldErrors = {};
  if (!fullName) fieldErrors.fullName = "이름을 입력하세요.";
  if (!isAdminEmailLogin && !team) fieldErrors.team = "소속팀을 선택하세요.";
  if (!password) fieldErrors.password = "비밀번호를 입력하세요.";

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", error: "validation", fieldErrors };
  }

  const supabase = await createClient();

  let email: string | null;
  if (isAdminEmailLogin) {
    email = fullName;
  } else {
    const tenantId = process.env.DEFAULT_TENANT_ID!;
    const { data } = await supabase.rpc("lookup_auth_email", {
      p_tenant_id: tenantId,
      p_full_name: fullName,
      p_team: team,
    });
    email = data;
  }
  if (!email) {
    return { status: "error", error: "invalid-credentials" };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { status: "error", error: "invalid-credentials" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user!.id).single();

  if (!profile || profile.status !== "approved") {
    await supabase.auth.signOut();
    return { status: "error", error: "pending-approval" };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

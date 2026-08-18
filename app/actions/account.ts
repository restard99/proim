"use server";

import { createClient } from "@/lib/supabase/server";

export type ChangePasswordFieldErrors = Partial<Record<"currentPassword" | "password" | "passwordConfirm", string>>;

export type ChangePasswordState =
  | { status: "idle" }
  | { status: "error"; error: "validation"; fieldErrors: ChangePasswordFieldErrors }
  | { status: "error"; error: "wrong-current-password" }
  | { status: "error"; error: "unknown" }
  | { status: "success" };

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  const fieldErrors: ChangePasswordFieldErrors = {};
  if (!currentPassword) fieldErrors.currentPassword = "현재 비밀번호를 입력하세요.";
  if (password.length < 8) fieldErrors.password = "비밀번호는 8자 이상이어야 합니다.";
  if (password !== passwordConfirm) fieldErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", error: "validation", fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { status: "error", error: "unknown" };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return { status: "error", error: "wrong-current-password" };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { status: "error", error: "unknown" };
  }

  return { status: "success" };
}

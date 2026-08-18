import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-xl mx-auto px-6 lg:px-10 py-10">
      <h1 className="text-xl font-semibold text-inktext">내 정보</h1>
      <p className="mt-1.5 text-sm text-muted">비밀번호를 변경합니다. 현재 비밀번호 확인이 필요합니다.</p>
      <div className="mt-6 rounded-lg border border-mist bg-white p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}

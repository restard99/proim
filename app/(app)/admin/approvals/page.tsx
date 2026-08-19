import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApprovalTable, type PendingProfile } from "@/components/admin/ApprovalTable";
import { UserAccountTable } from "@/components/admin/UserAccountTable";
import { listAllUsers } from "@/app/actions/admin-users";

export default async function AdminApprovalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (viewer?.role !== "admin") redirect("/");

  const { data: pending } = await supabase
    .from("profiles")
    .select("id, full_name, team, role, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const pendingList = (pending ?? []) as PendingProfile[];

  const usersResult = await listAllUsers();
  const allUsers = usersResult.ok ? usersResult.users : [];

  return (
    <div className="max-w-4xl px-6 lg:px-10 py-8">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-inktext">가입 승인 관리</h1>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            pendingList.length > 0 ? "text-crimsond bg-crimson/10" : "text-brine bg-brine/10"
          }`}
        >
          대기중 {pendingList.length}건
        </span>
      </div>
      <p className="mt-1.5 text-sm text-muted">새로 가입한 계정을 확인하고 승인하거나 반려하세요.</p>

      <ApprovalTable pending={pendingList} />

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-inktext">전체 사용자</h2>
        <p className="mt-1.5 text-sm text-muted">
          비밀번호를 잊은 사용자를 위해 임시 비밀번호를 발급할 수 있습니다.
        </p>
        <UserAccountTable users={allUsers} />
      </div>
    </div>
  );
}

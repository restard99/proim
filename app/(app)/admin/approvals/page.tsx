import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminApprovalsTabs } from "@/components/admin/AdminApprovalsTabs";
import { type PendingProfile } from "@/components/admin/ApprovalTable";
import { listAllUsers } from "@/app/actions/admin-users";
import { getGrantableUsers } from "@/app/actions/menu-permissions";

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

  const grantableResult = await getGrantableUsers();
  const grantableUsers = grantableResult.ok ? grantableResult.users : [];

  return (
    <div className="max-w-6xl px-6 lg:px-10 py-8">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-inktext">가입 승인 관리</h1>
      </div>
      <p className="mt-1.5 text-sm text-muted">가입 승인, 계정 관리, 개인별 메뉴 권한을 한 곳에서 처리합니다.</p>

      <div className="mt-6">
        <AdminApprovalsTabs pending={pendingList} allUsers={allUsers} grantableUsers={grantableUsers} />
      </div>
    </div>
  );
}

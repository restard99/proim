import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApprovalTable, type PendingProfile } from "@/components/admin/ApprovalTable";

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

  return (
    <div className="min-h-screen bg-salt">
      <header className="border-b border-mist bg-white px-6 lg:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="태평염전 로고" width={403} height={143} className="h-7 w-auto" />
          <span className="text-xs font-medium bg-ink text-salt px-2 py-0.5 rounded">관리자</span>
        </div>
        <div className="text-sm text-muted">시스템 관리자</div>
      </header>

      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
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
      </div>
    </div>
  );
}

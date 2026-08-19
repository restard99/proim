import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAllUsers } from "@/app/actions/admin-users";
import { AdminViewAsPicker } from "@/components/admin/AdminViewAsPicker";

export default async function AdminViewAsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (viewer?.role !== "admin") redirect("/");

  const usersResult = await listAllUsers();
  const candidates = usersResult.ok
    ? usersResult.users.filter((u) => u.role !== "admin" && u.status === "approved")
    : [];

  return (
    <div className="max-w-4xl px-6 lg:px-10 py-8">
      <h1 className="text-xl font-semibold text-inktext">시스템검토 게시판</h1>
      <p className="mt-1.5 text-sm text-muted">
        부서를 선택하고 담당자를 클릭하면, 그 계정으로 로그인한 것처럼 화면을 확인할 수 있습니다.
      </p>
      <AdminViewAsPicker users={candidates} />
    </div>
  );
}

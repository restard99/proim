import Image from "next/image";
import Link from "next/link";
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
    <div className="min-h-screen bg-salt">
      <header className="flex items-center justify-between border-b border-mist bg-white px-6 py-4 lg:px-10">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="태평염전 로고" width={403} height={143} className="h-7 w-auto" />
          <span className="rounded bg-ink px-2 py-0.5 text-xs font-medium text-salt">관리자</span>
        </div>
        <div className="text-sm text-muted">시스템 관리자</div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-10">
        <Link href="/" className="mb-6 inline-flex items-center gap-1 text-xs text-muted hover:text-inktext">
          ← 홈으로 돌아가기
        </Link>
        <h1 className="text-xl font-semibold text-inktext">시스템검토 게시판</h1>
        <p className="mt-1.5 text-sm text-muted">
          부서를 선택하고 담당자를 클릭하면, 그 계정으로 로그인한 것처럼 화면을 확인할 수 있습니다.
        </p>
        <AdminViewAsPicker users={candidates} />
      </div>
    </div>
  );
}

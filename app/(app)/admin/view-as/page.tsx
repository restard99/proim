import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAllUsers } from "@/app/actions/admin-users";
import { getGrantableUsers } from "@/app/actions/menu-permissions";
import { AdminViewAsTabs } from "@/components/admin/AdminViewAsTabs";

export default async function AdminViewAsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (viewer?.role !== "admin") redirect("/");

  const usersResult = await listAllUsers();
  const viewAsCandidates = usersResult.ok
    ? usersResult.users.filter((u) => u.role !== "admin" && u.status === "approved")
    : [];

  const grantableResult = await getGrantableUsers();
  const grantableUsers = grantableResult.ok ? grantableResult.users : [];

  return (
    <div className="max-w-6xl px-6 lg:px-10 py-8">
      <AdminViewAsTabs viewAsCandidates={viewAsCandidates} grantableUsers={grantableUsers} />
    </div>
  );
}

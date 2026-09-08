import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewProductionRequests } from "@/components/layout/nav-items";
import { getGrantedHrefs } from "@/lib/auth/menu-access";
import { ProductionRequestView } from "@/components/inventory/ProductionRequestView";

export default async function ProductionRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const grantedHrefs = await getGrantedHrefs(supabase, user.id);
  if (!canViewProductionRequests(profile.team, profile.role) && !grantedHrefs.has("/production-requests")) redirect("/");

  const canManage = profile.role === "admin" || (profile.team === "영업채산팀" && profile.role === "leader");

  return (
    <div className="max-w-7xl px-5 py-8 lg:px-8">
      <ProductionRequestView canManage={canManage} />
    </div>
  );
}

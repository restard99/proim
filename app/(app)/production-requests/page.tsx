import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewInventory } from "@/components/layout/nav-items";
import { ProductionRequestView } from "@/components/inventory/ProductionRequestView";

export default async function ProductionRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  if (!canViewInventory(profile.team, profile.role)) redirect("/");

  const canManage = profile.role === "admin" || (profile.team === "영업채산팀" && profile.role === "leader");

  return (
    <div className="max-w-7xl px-5 py-8 lg:px-8">
      <ProductionRequestView canManage={canManage} />
    </div>
  );
}

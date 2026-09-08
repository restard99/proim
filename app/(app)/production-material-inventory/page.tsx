import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewProductionMaterialInventory } from "@/components/layout/nav-items";
import { getGrantedHrefs } from "@/lib/auth/menu-access";
import { ProductionMaterialInventoryView } from "@/components/production/ProductionMaterialInventoryView";

export default async function ProductionMaterialInventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const grantedHrefs = await getGrantedHrefs(supabase, user.id);
  if (!canViewProductionMaterialInventory(profile.team, profile.role) && !grantedHrefs.has("/production-material-inventory"))
    redirect("/");

  return (
    <div className="max-w-7xl px-5 py-8 lg:px-8">
      <ProductionMaterialInventoryView currentUserId={user.id} isAdmin={profile.role === "admin"} />
    </div>
  );
}

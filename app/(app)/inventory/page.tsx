import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewInventory } from "@/components/layout/nav-items";
import { getGrantedHrefs } from "@/lib/auth/menu-access";
import { InventoryView } from "@/components/inventory/InventoryView";

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const grantedHrefs = await getGrantedHrefs(supabase, user.id);
  if (!canViewInventory(profile.team, profile.role) && !grantedHrefs.has("/inventory")) redirect("/");

  return <InventoryView />;
}

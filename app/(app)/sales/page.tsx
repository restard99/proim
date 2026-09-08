import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewSales } from "@/components/layout/nav-items";
import { getGrantedHrefs } from "@/lib/auth/menu-access";
import { SalesByCustomerView } from "@/components/sales/SalesByCustomerView";

export default async function SalesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const grantedHrefs = await getGrantedHrefs(supabase, user.id);
  if (!canViewSales(profile.team, profile.role) && !grantedHrefs.has("/sales")) redirect("/");

  return <SalesByCustomerView />;
}

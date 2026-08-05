import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SALES_TEAMS } from "@/components/layout/nav-items";
import { SalesByCustomerView } from "@/components/sales/SalesByCustomerView";

export default async function SalesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const allowed = profile.role === "admin" || SALES_TEAMS.includes(profile.team ?? "");
  if (!allowed) redirect("/");

  return <SalesByCustomerView />;
}

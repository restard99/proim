import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewDisbursements } from "@/components/layout/nav-items";
import { DisbursementsView } from "@/components/disbursements/DisbursementsView";

export default async function DisbursementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  if (!canViewDisbursements(profile.team, profile.role)) redirect("/");

  return <DisbursementsView />;
}

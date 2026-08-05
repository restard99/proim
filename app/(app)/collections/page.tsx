import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewSales } from "@/components/layout/nav-items";
import { CollectionsView } from "@/components/collections/CollectionsView";

export default async function CollectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  if (!canViewSales(profile.team, profile.role)) redirect("/");

  return <CollectionsView />;
}

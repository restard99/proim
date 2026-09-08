import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewSaltfield } from "@/components/layout/nav-items";
import { getGrantedHrefs } from "@/lib/auth/menu-access";
import { getProductionRecords, getProductionSummary } from "@/app/actions/saltfield-production";
import { ProductionRecordList } from "@/components/saltfield/ProductionRecordList";

export default async function SaltfieldProductionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");
  const grantedHrefs = await getGrantedHrefs(supabase, user.id);
  if (!canViewSaltfield(profile.team, profile.role) && !grantedHrefs.has("/saltfield-production")) redirect("/");

  const [records, summary] = await Promise.all([getProductionRecords(), getProductionSummary()]);

  return (
    <div className="max-w-5xl px-6 lg:px-10 py-8">
      <ProductionRecordList records={records} summary={summary} />
    </div>
  );
}

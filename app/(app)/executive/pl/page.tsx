import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewExecutive } from "@/components/layout/nav-items";
import { getProfitLoss } from "@/app/actions/executive-pl";
import { EXECUTIVE_PL_CORPS } from "@/lib/yerp/executive-corps";
import { ProfitLossView } from "@/components/executive/ProfitLossView";

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ExecutivePlPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile || !canViewExecutive(profile.team, profile.role)) redirect("/");

  const corpCode = EXECUTIVE_PL_CORPS[0].corpCode;
  const yearMonth = currentYearMonth();
  const data = await getProfitLoss(corpCode, yearMonth);

  return <ProfitLossView initialCorpCode={corpCode} initialYearMonth={yearMonth} initialData={data} />;
}

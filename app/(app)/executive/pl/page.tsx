import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewExecutive } from "@/components/layout/nav-items";
import { getProfitLoss } from "@/app/actions/executive-pl";
import { EXECUTIVE_PL_CORPS } from "@/lib/yerp/executive-corps";
import { ProfitLossView } from "@/components/executive/ProfitLossView";

// 손익자료는 당월 자료가 아직 다 안 잡혀있는 경우가 많아, 기본 조회월을 항상 전달로 연다.
function defaultYearMonth(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
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
  const yearMonth = defaultYearMonth();
  const data = await getProfitLoss(corpCode, yearMonth);

  return <ProfitLossView initialCorpCode={corpCode} initialYearMonth={yearMonth} initialData={data} />;
}

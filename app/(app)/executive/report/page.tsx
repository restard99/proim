import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewExecutive } from "@/components/layout/nav-items";
import { getWeeklyReport, getComments } from "@/app/actions/executive-report";
import { WeeklyReportView } from "@/components/executive/WeeklyReportView";

function currentWeekMonday(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=일 ... 1=월
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

export default async function ExecutiveReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile || !canViewExecutive(profile.team, profile.role)) redirect("/");

  const weekStartDate = currentWeekMonday();
  const [report, comments] = await Promise.all([getWeeklyReport(weekStartDate), getComments(weekStartDate)]);

  return <WeeklyReportView initialWeekStartDate={weekStartDate} initialReport={report} initialComments={comments} />;
}

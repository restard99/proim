import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { SALES_TEAMS } from "@/components/layout/nav-items";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, team, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const showSalesSection = profile.role === "admin" || SALES_TEAMS.includes(profile.team ?? "");

  return (
    <AppShell userName={profile.full_name ?? ""} userTeam={profile.team ?? ""} showSalesSection={showSalesSection}>
      {children}
    </AppShell>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, team").eq("id", user.id).single();
  if (!profile) redirect("/login");

  return (
    <AppShell userName={profile.full_name ?? ""} userTeam={profile.team ?? ""}>
      {children}
    </AppShell>
  );
}

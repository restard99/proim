import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ADMIN_NAV_ITEMS, getVisibleBusinessNavItems } from "@/components/layout/nav-items";
import { VIEW_AS_COOKIE } from "@/lib/view-as";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const isViewingAs = Boolean(cookieStore.get(VIEW_AS_COOKIE));

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

  const businessNavItems = getVisibleBusinessNavItems(profile.team, profile.role);
  const adminNavItems = profile.role === "admin" ? ADMIN_NAV_ITEMS : [];

  return (
    <AppShell
      userName={profile.full_name ?? ""}
      userTeam={profile.team ?? ""}
      businessNavItems={businessNavItems}
      adminNavItems={adminNavItems}
      isViewingAs={isViewingAs}
    >
      {children}
    </AppShell>
  );
}

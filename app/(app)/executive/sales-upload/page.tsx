import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canUploadSeomdeulchaeSales } from "@/components/layout/nav-items";
import { getGrantedHrefs } from "@/lib/auth/menu-access";
import { SeomdeulchaeSalesUploadPanel } from "@/components/executive/SeomdeulchaeSalesUploadPanel";

export default async function SeomdeulchaeSalesUploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const grantedHrefs = await getGrantedHrefs(supabase, user.id);
  if (!canUploadSeomdeulchaeSales(profile.team, profile.role) && !grantedHrefs.has("/executive/sales-upload")) {
    redirect("/");
  }

  return (
    <div className="max-w-4xl px-6 lg:px-10 py-8">
      <h1 className="text-xl font-semibold text-inktext">매출업로드</h1>
      <p className="mt-1.5 text-sm text-muted">섬들채 업장별 실적(매출)을 업로드합니다.</p>
      <div className="mt-6">
        <SeomdeulchaeSalesUploadPanel />
      </div>
    </div>
  );
}

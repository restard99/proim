import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canUploadSeomdeulchaeSales } from "@/components/layout/nav-items";
import { getGrantedHrefs } from "@/lib/auth/menu-access";
import { getSeomdeulchaeSalesRawSummary } from "@/app/actions/executive-seomdeulchae-sales";
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

  const summary = await getSeomdeulchaeSalesRawSummary();

  return (
    <div className="max-w-4xl px-6 lg:px-10 py-8">
      <h1 className="text-xl font-semibold text-inktext">매출업로드</h1>
      <p className="mt-1.5 text-sm text-muted">
        섬들채 POS &quot;매출관리 &gt; 매출현황 &gt; 일자별 &gt; 상품별&quot;에서 내려받은 파일을 업로드합니다.
      </p>
      <ul className="mt-1 space-y-0.5 text-xs text-muted/80">
        <li>· 카드분류 확인: 매출관리 &gt; 승인현황 &gt; 승인현황</li>
        <li>· 면세 확인: 매출관리 &gt; 매출현황 &gt; 당일매출상세현황</li>
      </ul>
      <div className="mt-6">
        <SeomdeulchaeSalesUploadPanel summary={summary} />
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTargetUploadHistory } from "@/app/actions/executive-targets";
import { getPlConfirmedUploadHistory } from "@/app/actions/executive-pl-confirmed";
import { getPlBusinessUnitUploadHistory } from "@/app/actions/executive-pl-business-unit";
import { ExecutiveTargetUpload } from "@/components/admin/ExecutiveTargetUpload";

export default async function ExecutiveTargetsAdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (viewer?.role !== "admin") redirect("/");

  const [targetHistory, plConfirmedHistory, plBusinessUnitHistory] = await Promise.all([
    getTargetUploadHistory(),
    getPlConfirmedUploadHistory(),
    getPlBusinessUnitUploadHistory(),
  ]);

  return (
    <div className="max-w-4xl px-6 lg:px-10 py-8">
      <h1 className="text-xl font-semibold text-inktext">매출 목표 관리</h1>
      <p className="mt-1.5 text-sm text-muted">
        임원실 주간업무보고/손익자료 화면에 쓰일 목표(계획)와 회계팀 확정 손익을 엑셀로 업로드합니다.
      </p>
      <div className="mt-6">
        <ExecutiveTargetUpload
          targetHistory={targetHistory}
          plConfirmedHistory={plConfirmedHistory}
          plBusinessUnitHistory={plBusinessUnitHistory}
        />
      </div>
    </div>
  );
}

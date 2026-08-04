import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyDailyReports } from "@/app/actions/worklog";
import { MemberWorklogView } from "@/components/worklog/MemberWorklogView";
import { PlaceholderScreen } from "@/components/layout/PlaceholderScreen";

export default async function WorklogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  if (profile.role === "member") {
    const reports = await getMyDailyReports();
    return <MemberWorklogView initialReports={reports} />;
  }

  return (
    <PlaceholderScreen
      iconPath="M5 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.828a2 2 0 0 0-.586-1.414l-3.828-3.828A2 2 0 0 0 11.172 2H5Zm1 8a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H6Zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H6Z"
      evenOdd
      title="팀장 업무일지 화면 준비 중입니다"
      description={
        <>
          팀원 취합·상신 기능이
          <br />
          곧 이어서 구현됩니다. (TASK-004)
        </>
      }
    />
  );
}

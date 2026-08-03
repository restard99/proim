import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SIGNUP_ROLES } from "@/lib/auth/constants";

const STATUS_LABEL: Record<string, string> = {
  pending: "승인 대기",
  approved: "승인 완료",
  rejected: "반려됨",
};

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, team, role, status")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const roleLabel = SIGNUP_ROLES.find((r) => r.value === profile.role)?.label ?? profile.role;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-salt">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-brine/10 flex items-center justify-center">
          <svg className="h-7 w-7 text-brine" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.3.7l2.5 2.5a1 1 0 001.4-1.4L11 10.6V6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-inktext">가입 요청을 보냈습니다</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          관리자 승인 후 로그인할 수 있습니다.
          <br />
          승인은 보통 영업일 기준 1일 이내 처리됩니다.
        </p>

        <div className="mt-6 rounded-md border border-mist bg-mist/40 px-4 py-3.5 text-sm text-left space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted">이름</span>
            <span className="font-medium">{profile.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">소속팀</span>
            <span className="font-medium">{profile.team}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">직급</span>
            <span className="font-medium">{roleLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">상태</span>
            <span className="font-medium text-brine">{STATUS_LABEL[profile.status] ?? profile.status}</span>
          </div>
        </div>

        <Link
          href="/login"
          className="mt-7 block w-full rounded-md border border-mist hover:bg-mist/50 text-inktext text-sm font-medium py-2.5 transition-colors"
        >
          로그인 화면으로
        </Link>
      </div>
    </div>
  );
}

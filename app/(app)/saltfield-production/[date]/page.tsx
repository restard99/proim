import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewSaltfield } from "@/components/layout/nav-items";
import { getProductionRecordDetail } from "@/app/actions/saltfield-production";
import { ProductionRecordDetail } from "@/components/saltfield/ProductionRecordDetail";

export default async function SaltfieldProductionDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (!canViewSaltfield(profile.team, profile.role)) redirect("/");

  const detail = await getProductionRecordDetail(date);
  if (!detail) notFound();

  return (
    <div className="max-w-5xl px-6 lg:px-10 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/saltfield-production" className="text-muted hover:text-inktext text-sm">
          ← 목록
        </Link>
        <h1 className="text-lg font-semibold text-inktext">{detail.record_date} 생산량 상세</h1>
      </div>
      <ProductionRecordDetail detail={detail} />
    </div>
  );
}

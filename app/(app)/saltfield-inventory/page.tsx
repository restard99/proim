import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewSaltfield } from "@/components/layout/nav-items";
import { getMaterialInventory, getMaterialMonths } from "@/app/actions/saltfield-materials";
import { MaterialInventoryTable } from "@/components/saltfield/MaterialInventoryTable";

export default async function SaltfieldInventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("team, role").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (!canViewSaltfield(profile.team, profile.role)) redirect("/");

  const [rows, months] = await Promise.all([getMaterialInventory(), getMaterialMonths()]);

  const currentMonthLabel = `${new Date().getMonth() + 1}월`;
  const defaultMonth = months.includes(currentMonthLabel) ? currentMonthLabel : (months[months.length - 1] ?? "1월");

  return (
    <div className="max-w-5xl px-6 lg:px-10 py-8">
      <h1 className="text-lg font-semibold text-inktext mb-1">부자재재고현황</h1>
      <p className="text-sm text-muted mb-6">
        업체별·품목별 재고 수량과 재고금액을 확인합니다. 새 파일을 올리면 전체 데이터가 교체됩니다.
      </p>
      <MaterialInventoryTable rows={rows} months={months} defaultMonth={defaultMonth} />
    </div>
  );
}

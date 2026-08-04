"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DailyReportRow = {
  id: string;
  report_date: string;
  visited_customers: string | null;
  content: string | null;
  notes: string | null;
  status: "draft" | "submitted";
};

export type SaveResult = { ok: true } | { ok: false; message: string };

async function getSelf(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, team")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return { userId: user.id, tenantId: profile.tenant_id as string, team: profile.team as string };
}

export async function getMyDailyReports(limit = 10): Promise<DailyReportRow[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return [];

  const { data } = await supabase
    .from("daily_reports")
    .select("id, report_date, visited_customers, content, notes, status")
    .eq("author_id", self.userId)
    .order("report_date", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function saveDailyReport(input: {
  reportDate: string;
  visitedCustomers: string;
  content: string;
  notes: string;
  status: "draft" | "submitted";
}): Promise<SaveResult> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };

  const { error } = await supabase.from("daily_reports").upsert(
    {
      tenant_id: self.tenantId,
      author_id: self.userId,
      team: self.team,
      report_date: input.reportDate,
      visited_customers: input.visitedCustomers,
      content: input.content,
      notes: input.notes,
      status: input.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,author_id,report_date" },
  );

  if (error) return { ok: false, message: "저장 중 오류가 발생했습니다." };

  revalidatePath("/worklog");
  return { ok: true };
}

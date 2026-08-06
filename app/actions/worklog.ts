"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DailyReportAttachment = { id: string; path: string; name: string };

export type DailyReportRow = {
  id: string;
  report_date: string;
  visited_customers: string | null;
  content: string | null;
  notes: string | null;
  status: "draft" | "submitted";
  attachments: DailyReportAttachment[];
};

export type SaveResult = { ok: true } | { ok: false; message: string };
export type SaveReportResult = { ok: true; id: string } | { ok: false; message: string };
export type SaveDailyReportResult = { ok: true; report: DailyReportRow } | { ok: false; message: string };

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

export async function getMyDailyReports(limit = 30): Promise<DailyReportRow[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return [];

  const { data } = await supabase
    .from("daily_reports")
    .select(
      "id, report_date, visited_customers, content, notes, status, daily_report_attachments(id, path, name)",
    )
    .eq("author_id", self.userId)
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id,
    report_date: r.report_date,
    visited_customers: r.visited_customers,
    content: r.content,
    notes: r.notes,
    status: r.status,
    attachments: r.daily_report_attachments ?? [],
  }));
}

async function fetchDailyReportRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<DailyReportRow | null> {
  const { data } = await supabase
    .from("daily_reports")
    .select(
      "id, report_date, visited_customers, content, notes, status, daily_report_attachments(id, path, name)",
    )
    .eq("id", id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    report_date: data.report_date,
    visited_customers: data.visited_customers,
    content: data.content,
    notes: data.notes,
    status: data.status,
    attachments: data.daily_report_attachments ?? [],
  };
}

export async function saveDailyReport(input: {
  id?: string;
  reportDate: string;
  visitedCustomers: string;
  content: string;
  notes: string;
  status: "draft" | "submitted";
}): Promise<SaveDailyReportResult> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };

  if (input.id) {
    const { error } = await supabase
      .from("daily_reports")
      .update({
        report_date: input.reportDate,
        visited_customers: input.visitedCustomers,
        content: input.content,
        notes: input.notes,
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("author_id", self.userId);

    if (error) return { ok: false, message: "저장 중 오류가 발생했습니다." };
    revalidatePath("/worklog");
    const report = await fetchDailyReportRow(supabase, input.id);
    if (!report) return { ok: false, message: "저장 중 오류가 발생했습니다." };
    return { ok: true, report };
  }

  // 하루에 1건만 작성되도록: 같은 날짜에 이미 작성한 업무일지가 있으면
  // 새로 만들지 않고 기존 내용 뒤에 이어붙인다.
  const { data: existing } = await supabase
    .from("daily_reports")
    .select("id, visited_customers, content, notes")
    .eq("author_id", self.userId)
    .eq("report_date", input.reportDate)
    .maybeSingle();

  if (existing) {
    const addedBlock = input.visitedCustomers
      ? `<p><strong>${escapeHtml(input.visitedCustomers)}</strong>(${input.reportDate})</p>${input.content}`
      : `<p>(${input.reportDate})</p>${input.content}`;
    const mergedContent = existing.content ? `${existing.content}${addedBlock}` : addedBlock;
    const mergedNotes = [existing.notes, input.notes].filter(Boolean).join("\n");

    const { error } = await supabase
      .from("daily_reports")
      .update({
        visited_customers: existing.visited_customers || input.visitedCustomers,
        content: mergedContent,
        notes: mergedNotes,
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("author_id", self.userId);

    if (error) return { ok: false, message: "저장 중 오류가 발생했습니다." };
    revalidatePath("/worklog");
    const report = await fetchDailyReportRow(supabase, existing.id);
    if (!report) return { ok: false, message: "저장 중 오류가 발생했습니다." };
    return { ok: true, report };
  }

  const { data, error } = await supabase
    .from("daily_reports")
    .insert({
      tenant_id: self.tenantId,
      author_id: self.userId,
      team: self.team,
      report_date: input.reportDate,
      visited_customers: input.visitedCustomers,
      content: input.content,
      notes: input.notes,
      status: input.status,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: "저장 중 오류가 발생했습니다." };

  revalidatePath("/worklog");
  const report = await fetchDailyReportRow(supabase, data.id);
  if (!report) return { ok: false, message: "저장 중 오류가 발생했습니다." };
  return { ok: true, report };
}

export async function deleteDailyReport(id: string): Promise<SaveResult> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };

  const { data: attachments } = await supabase
    .from("daily_report_attachments")
    .select("path")
    .eq("report_id", id);

  const { error } = await supabase.from("daily_reports").delete().eq("id", id).eq("author_id", self.userId);
  if (error) return { ok: false, message: "삭제 중 오류가 발생했습니다." };

  if (attachments && attachments.length > 0) {
    await supabase.storage.from("worklog-attachments").remove(attachments.map((a) => a.path));
  }

  revalidatePath("/worklog");
  return { ok: true };
}

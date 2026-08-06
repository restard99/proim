"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SaveResult } from "@/app/actions/worklog";

export type RosterEntry =
  | { id: string; name: string; kind: "member"; submittedToday: boolean }
  | { id: string; name: string; kind: "team"; team: string; submittedToday: boolean };

export type RecentEntryAttachment = { id: string; path: string; name: string };

export type RecentEntry = {
  id: string;
  reportDate: string;
  status: "draft" | "submitted";
  content: string | null;
  visitedCustomers: string | null;
  attachments: RecentEntryAttachment[];
};

function sevenDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

export type TeamReportRow = {
  id: string;
  report_date: string;
  content: string | null;
  status: "draft" | "submitted";
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function getLeaderSelf(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, team, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "leader") return null;

  return { userId: user.id, tenantId: profile.tenant_id as string, team: profile.team as string };
}

export async function getLeaderRoster(): Promise<{
  teamLabel: string;
  reportsToTeam: string | null;
  roster: RosterEntry[];
}> {
  const supabase = await createClient();
  const self = await getLeaderSelf(supabase);
  if (!self) return { teamLabel: "", reportsToTeam: null, roster: [] };

  const today = todayISO();

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("tenant_id", self.tenantId)
    .eq("team", self.team)
    .eq("role", "member")
    .eq("status", "approved");

  const memberIds = (members ?? []).map((m) => m.id);
  const { data: todayReports } = memberIds.length
    ? await supabase
        .from("daily_reports")
        .select("author_id, status")
        .eq("report_date", today)
        .in("author_id", memberIds)
    : { data: [] as { author_id: string; status: string }[] };

  const submittedSet = new Set(
    (todayReports ?? []).filter((r) => r.status === "submitted").map((r) => r.author_id),
  );

  const memberEntries: RosterEntry[] = (members ?? []).map((m) => ({
    id: m.id,
    name: m.full_name ?? "",
    kind: "member",
    submittedToday: submittedSet.has(m.id),
  }));

  const { data: downstream } = await supabase
    .from("team_hierarchy")
    .select("team")
    .eq("tenant_id", self.tenantId)
    .eq("reports_to_team", self.team);

  const downstreamTeams = (downstream ?? []).map((d) => d.team);
  let upstreamEntries: RosterEntry[] = [];
  if (downstreamTeams.length) {
    const { data: leaders } = await supabase
      .from("profiles")
      .select("id, full_name, team")
      .eq("tenant_id", self.tenantId)
      .in("team", downstreamTeams)
      .eq("role", "leader");

    const leaderIds = (leaders ?? []).map((l) => l.id);
    const { data: teamReportsToday } = leaderIds.length
      ? await supabase
          .from("team_daily_reports")
          .select("author_id, status")
          .eq("report_date", today)
          .in("author_id", leaderIds)
      : { data: [] as { author_id: string; status: string }[] };
    const teamSubmittedSet = new Set(
      (teamReportsToday ?? []).filter((r) => r.status === "submitted").map((r) => r.author_id),
    );

    upstreamEntries = (leaders ?? []).map((l) => ({
      id: l.id,
      name: l.full_name ?? "",
      kind: "team",
      team: l.team ?? "",
      submittedToday: teamSubmittedSet.has(l.id),
    }));
  }

  const { data: myHierarchy } = await supabase
    .from("team_hierarchy")
    .select("reports_to_team")
    .eq("tenant_id", self.tenantId)
    .eq("team", self.team)
    .maybeSingle();

  return {
    teamLabel: self.team,
    reportsToTeam: myHierarchy?.reports_to_team ?? null,
    roster: [...memberEntries, ...upstreamEntries],
  };
}

export async function getPersonRecentEntries(
  personId: string,
  kind: "member" | "team",
): Promise<RecentEntry[]> {
  const supabase = await createClient();
  const self = await getLeaderSelf(supabase);
  if (!self) return [];

  const { data: target } = await supabase.from("profiles").select("team").eq("id", personId).single();
  if (!target?.team) return [];

  const sinceDate = sevenDaysAgoISO();

  if (kind === "member") {
    if (target.team !== self.team) return [];
    const { data } = await supabase
      .from("daily_reports")
      .select("id, report_date, status, content, visited_customers, daily_report_attachments(id, path, name)")
      .eq("author_id", personId)
      .gte("report_date", sinceDate)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    return (data ?? []).map((r) => ({
      id: r.id,
      reportDate: r.report_date,
      status: r.status,
      content: r.content,
      visitedCustomers: r.visited_customers,
      attachments: r.daily_report_attachments ?? [],
    }));
  }

  const { data: hierarchy } = await supabase
    .from("team_hierarchy")
    .select("reports_to_team")
    .eq("tenant_id", self.tenantId)
    .eq("team", target.team)
    .maybeSingle();
  if (hierarchy?.reports_to_team !== self.team) return [];

  const { data } = await supabase
    .from("team_daily_reports")
    .select("id, report_date, status, content")
    .eq("author_id", personId)
    .gte("report_date", sinceDate)
    .order("report_date", { ascending: false })
    .limit(7);
  return (data ?? []).map((r) => ({
    id: r.id,
    reportDate: r.report_date,
    status: r.status,
    content: r.content,
    visitedCustomers: null,
    attachments: [],
  }));
}

export async function getMyTeamReports(limit = 10): Promise<TeamReportRow[]> {
  const supabase = await createClient();
  const self = await getLeaderSelf(supabase);
  if (!self) return [];

  const { data } = await supabase
    .from("team_daily_reports")
    .select("id, report_date, content, status")
    .eq("author_id", self.userId)
    .order("report_date", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function saveTeamReport(input: {
  reportDate: string;
  content: string;
  status: "draft" | "submitted";
}): Promise<SaveResult> {
  const supabase = await createClient();
  const self = await getLeaderSelf(supabase);
  if (!self) return { ok: false, message: "권한이 없습니다." };

  const { error } = await supabase.from("team_daily_reports").upsert(
    {
      tenant_id: self.tenantId,
      team: self.team,
      author_id: self.userId,
      report_date: input.reportDate,
      content: input.content,
      status: input.status,
      submitted_at: input.status === "submitted" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,team,report_date" },
  );

  if (error) return { ok: false, message: "저장 중 오류가 발생했습니다." };

  revalidatePath("/worklog");
  return { ok: true };
}

export async function deleteTeamReport(reportDate: string): Promise<SaveResult> {
  const supabase = await createClient();
  const self = await getLeaderSelf(supabase);
  if (!self) return { ok: false, message: "권한이 없습니다." };

  const { error } = await supabase
    .from("team_daily_reports")
    .delete()
    .eq("author_id", self.userId)
    .eq("report_date", reportDate);

  if (error) return { ok: false, message: "삭제 중 오류가 발생했습니다." };

  revalidatePath("/worklog");
  return { ok: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { EXECUTIVE_CORPS, type ExecutiveCorpCode } from "@/lib/yerp/executive-corps";
import {
  getSalesTotalByCorp,
  getSalesByCustomer,
  getSeomdeulchaeSalesByChannel,
  type ExecutiveCustomerSales,
} from "@/lib/yerp/executive-sales";
import { getTaepyeongSogeumProduction } from "@/lib/yerp/executive-production";

function toYmd(iso: string) {
  return iso.replaceAll("-", "");
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthRange(iso: string): { start: string; end: string; label: string } {
  const [y, m] = iso.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, label: `${y}-${String(m).padStart(2, "0")}` };
}

function lastYearFullMonthRange(iso: string): { start: string; end: string } {
  const [y, m] = iso.split("-").map(Number);
  const ly = y - 1;
  const start = `${ly}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(ly, m, 0)).getUTCDate();
  const end = `${ly}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

async function getSelf(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("tenant_id, team, role").eq("id", user.id).single();
  if (!profile) return null;

  return { userId: user.id, tenantId: profile.tenant_id as string, team: profile.team as string, role: profile.role as string };
}

function canViewReport(team: string, role: string) {
  return role === "admin" || team === "임원실";
}

type TargetLookup = {
  salesWeek: Map<string, number>; // corpCode -> value
  salesMonth: Map<string, number>;
  productionWeek: Map<string, number>; // category -> value
};

async function loadTargets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  weekStartDate: string,
  monthKey: string,
): Promise<TargetLookup> {
  const { data } = await supabase
    .from("executive_targets")
    .select("metric, corp_code, category, period_type, period_key, target_value")
    .eq("tenant_id", tenantId)
    .or(
      `and(period_type.eq.week,period_key.eq.${weekStartDate}),and(period_type.eq.month,period_key.eq.${monthKey})`,
    );

  const salesWeek = new Map<string, number>();
  const salesMonth = new Map<string, number>();
  const productionWeek = new Map<string, number>();

  for (const row of data ?? []) {
    if (row.metric === "sales" && row.corp_code) {
      if (row.period_type === "week") salesWeek.set(row.corp_code, Number(row.target_value));
      else salesMonth.set(row.corp_code, Number(row.target_value));
    } else if (row.metric === "production" && row.category && row.period_type === "week") {
      productionWeek.set(row.category, Number(row.target_value));
    }
  }

  return { salesWeek, salesMonth, productionWeek };
}

export type WeeklyReportPage1Corp = {
  corpCode: ExecutiveCorpCode;
  corpName: string;
  weekPlan: number | null;
  weekActual: number;
  monthPlan: number | null;
  monthActual: number;
  lastYearMonthActual: number;
};

export type WeeklyReportData = {
  weekStartDate: string;
  weekEndDate: string;
  monthLabel: string;
  page1: { corps: WeeklyReportPage1Corp[] };
  page2: { customers: ExecutiveCustomerSales[]; weekActual: number; monthActual: number };
  page3: {
    weeklyPlan: number | null;
    weeklyActual: number | null;
    monthlyPlan: number | null;
    monthlyActual: number | null;
  } | null;
  page4: {
    category: "천일염" | "가공염";
    weekPlan: number | null;
    weekActual: number;
    monthActual: number;
    lastYearMonthActual: number;
  }[];
  page5: { customers: ExecutiveCustomerSales[]; weekActual: number; monthActual: number };
  page6: { channels: { channel: string; weekActual: number }[]; weekPlan: number | null; monthActual: number };
};

export async function getWeeklyReport(weekStartDate: string): Promise<WeeklyReportData | null> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self || !canViewReport(self.team, self.role)) return null;

  const weekEndDate = addDays(weekStartDate, 6);
  const month = monthRange(weekStartDate);
  const lastYearMonth = lastYearFullMonthRange(weekStartDate);
  const monthToDateStart = toYmd(month.start);
  const monthToDateEnd = toYmd(weekEndDate);
  const weekStartYmd = toYmd(weekStartDate);
  const weekEndYmd = toYmd(weekEndDate);
  const lastYearMonthStartYmd = toYmd(lastYearMonth.start);
  const lastYearMonthEndYmd = toYmd(lastYearMonth.end);

  const targets = await loadTargets(supabase, self.tenantId, weekStartDate, month.label);

  const corpCodes = EXECUTIVE_CORPS.map((c) => c.corpCode);
  const [weekTotals, monthTotals, lastYearTotals, page2Customers, page5Customers, page6, page4Prod, page4ProdMonth, page4ProdLastYear] =
    await Promise.all([
      getSalesTotalByCorp({ corpCodes, startDate: weekStartYmd, endDate: weekEndYmd }),
      getSalesTotalByCorp({ corpCodes, startDate: monthToDateStart, endDate: monthToDateEnd }),
      getSalesTotalByCorp({ corpCodes, startDate: lastYearMonthStartYmd, endDate: lastYearMonthEndYmd }),
      getSalesByCustomer({ corpCode: "0400", startDate: weekStartYmd, endDate: weekEndYmd }),
      getSalesByCustomer({ corpCode: "0460", startDate: weekStartYmd, endDate: weekEndYmd }),
      getSeomdeulchaeSalesByChannel({ startDate: weekStartYmd, endDate: weekEndYmd }),
      getTaepyeongSogeumProduction({ startDate: weekStartYmd, endDate: weekEndYmd }),
      getTaepyeongSogeumProduction({ startDate: monthToDateStart, endDate: monthToDateEnd }),
      getTaepyeongSogeumProduction({ startDate: lastYearMonthStartYmd, endDate: lastYearMonthEndYmd }),
    ]);

  const [page2Month, page5Month, page6Month] = await Promise.all([
    getSalesByCustomer({ corpCode: "0400", startDate: monthToDateStart, endDate: monthToDateEnd }),
    getSalesByCustomer({ corpCode: "0460", startDate: monthToDateStart, endDate: monthToDateEnd }),
    getSeomdeulchaeSalesByChannel({ startDate: monthToDateStart, endDate: monthToDateEnd }),
  ]);

  const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

  const page1Corps: WeeklyReportPage1Corp[] = EXECUTIVE_CORPS.map((c) => ({
    corpCode: c.corpCode,
    corpName: c.corpName,
    weekPlan: targets.salesWeek.get(c.corpCode) ?? null,
    weekActual: weekTotals.find((t) => t.corpCode === c.corpCode)?.total ?? 0,
    monthPlan: targets.salesMonth.get(c.corpCode) ?? null,
    monthActual: monthTotals.find((t) => t.corpCode === c.corpCode)?.total ?? 0,
    lastYearMonthActual: lastYearTotals.find((t) => t.corpCode === c.corpCode)?.total ?? 0,
  }));

  // 태평염전 생산(3페이지)은 염전관리팀이 업로드하는 saltfield_production_records를 그대로 조회한다.
  const { data: saltfieldRow } = await supabase
    .from("saltfield_production_records")
    .select("weekly_plan, weekly_actual, monthly_plan, monthly_actual")
    .eq("tenant_id", self.tenantId)
    .lte("record_date", weekEndDate)
    .order("record_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const page4: WeeklyReportData["page4"] = page4Prod.map((p) => {
    const monthActual = page4ProdMonth.find((m) => m.category === p.category)?.qtyKg ?? 0;
    const lastYearMonthActual = page4ProdLastYear.find((m) => m.category === p.category)?.qtyKg ?? 0;
    return {
      category: p.category,
      weekPlan: targets.productionWeek.get(p.category) ?? null,
      weekActual: p.qtyKg,
      monthActual,
      lastYearMonthActual,
    };
  });

  return {
    weekStartDate,
    weekEndDate,
    monthLabel: month.label,
    page1: { corps: page1Corps },
    page2: { customers: page2Customers, weekActual: sum(page2Customers), monthActual: sum(page2Month) },
    page3: saltfieldRow
      ? {
          weeklyPlan: saltfieldRow.weekly_plan,
          weeklyActual: saltfieldRow.weekly_actual,
          monthlyPlan: saltfieldRow.monthly_plan,
          monthlyActual: saltfieldRow.monthly_actual,
        }
      : null,
    page4,
    page5: { customers: page5Customers, weekActual: sum(page5Customers), monthActual: sum(page5Month) },
    page6: {
      channels: page6.map((c) => ({ channel: c.channel, weekActual: c.amount })),
      weekPlan: EXECUTIVE_CORPS.find((c) => c.corpCode === "0360") ? targets.salesWeek.get("0360") ?? null : null,
      monthActual: sum(page6Month),
    },
  };
}

export type WeeklyComment = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
};

export async function getComments(weekStartDate: string): Promise<WeeklyComment[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return [];
  if (self.role !== "admin" && self.team !== "임원실" && self.team !== "전략기획실") return [];

  const { data } = await supabase
    .from("executive_weekly_comments")
    .select("id, body, created_at, author:profiles!author_id(full_name)")
    .eq("week_start_date", weekStartDate)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => {
    const author = Array.isArray(row.author) ? row.author[0] : row.author;
    return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorName: (author as { full_name: string | null } | null)?.full_name ?? null,
    };
  });
}

export type PostCommentResult = { ok: true } | { ok: false; message: string };

export async function postComment(weekStartDate: string, body: string): Promise<PostCommentResult> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, message: "내용을 입력하세요." };

  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };
  if (self.role !== "admin" && self.team !== "임원실") return { ok: false, message: "코멘트 작성 권한이 없습니다." };

  const { error } = await supabase.from("executive_weekly_comments").insert({
    tenant_id: self.tenantId,
    week_start_date: weekStartDate,
    author_id: self.userId,
    body: trimmed,
  });

  if (error) return { ok: false, message: "저장 중 오류가 발생했습니다." };
  return { ok: true };
}

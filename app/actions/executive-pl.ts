"use server";

import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { EXECUTIVE_PL_CORPS, type ExecutiveCorpCode } from "@/lib/yerp/executive-corps";
import { getSystemProfitLoss } from "@/lib/yerp/executive-pl";

function toYmd(iso: string) {
  return iso.replaceAll("-", "");
}

function monthDateRange(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = `${yearMonth}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function getSelf(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("tenant_id, team, role").eq("id", user.id).single();
  if (!profile) return null;

  return { tenantId: profile.tenant_id as string, team: profile.team as string, role: profile.role as string };
}

function canView(team: string, role: string) {
  return role === "admin" || team === "임원실";
}

export type ConfirmedPL = {
  revenue: number | null;
  cogs: number | null;
  sga: number | null;
  nonOperatingIncome: number | null;
  nonOperatingExpense: number | null;
};

export type MonthComparison = {
  yearMonth: string;
  systemRevenue: number;
  systemSga: number;
  confirmed: ConfirmedPL | null;
};

export type PeriodTotals = {
  revenue: number;
  cogs: number;
  sga: number;
  operatingProfit: number;
  hasEstimatedMonths: boolean; // 확정 자료가 없어 매출원가를 0으로 취급한 달이 하나라도 있으면 true
  // 확정(회계팀) 자료가 있는 달만 모아 별도로 합산한 값. 확정 자료가 한 달도 없으면 null.
  confirmedOnly: {
    revenue: number;
    cogs: number;
    sga: number;
    operatingProfit: number;
    monthsWithConfirmed: number;
    totalMonths: number;
  } | null;
};

export type TrendValues = { revenue: number; cogs: number; sga: number; operatingProfit: number; isEstimate: boolean };

export type ProfitLossData = {
  corpCode: ExecutiveCorpCode;
  current: MonthComparison;
  previousMonth: MonthComparison;
  lastYearSameMonth: MonthComparison;
  trend: { current: TrendValues; previousMonth: TrendValues; lastYearSameMonth: TrendValues };
  ytd: PeriodTotals;
  lastYearYtd: PeriodTotals;
};

// 섬들채(0360)는 법인 단위 확정 손익을 따로 올리지 않아도, 부문별(업장별) 업로드
// (executive_pl_business_unit)를 합산해서 확정값으로 쓴다 — 사용자가 참고 워크북 구조 그대로
// 부문별로만 올려도 상단 법인 합계 비교 표(전산/확정/차이)가 비게 되는 문제를 막기 위함.
// 부문별 업로드가 없으면 법인 단위 executive_pl_confirmed로 폴백한다.
async function getConfirmedFromBusinessUnits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  yearMonth: string,
): Promise<ConfirmedPL | null> {
  const { data } = await supabase
    .from("executive_pl_business_unit")
    .select("revenue, cogs, sga, non_operating_income, non_operating_expense")
    .eq("tenant_id", tenantId)
    .eq("corp_code", "0360")
    .eq("year_month", yearMonth);

  if (!data || data.length === 0) return null;

  const sum = (key: "revenue" | "cogs" | "sga" | "non_operating_income" | "non_operating_expense") =>
    data.reduce((total, row) => total + (row[key] ?? 0), 0);

  return {
    revenue: sum("revenue"),
    cogs: sum("cogs"),
    sga: sum("sga"),
    nonOperatingIncome: sum("non_operating_income"),
    nonOperatingExpense: sum("non_operating_expense"),
  };
}

async function getConfirmed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  corpCode: string,
  yearMonth: string,
): Promise<ConfirmedPL | null> {
  if (corpCode === "0360") {
    const fromUnits = await getConfirmedFromBusinessUnits(supabase, tenantId, yearMonth);
    if (fromUnits) return fromUnits;
  }

  const { data } = await supabase
    .from("executive_pl_confirmed")
    .select("revenue, cogs, sga, non_operating_income, non_operating_expense")
    .eq("tenant_id", tenantId)
    .eq("corp_code", corpCode)
    .eq("year_month", yearMonth)
    .maybeSingle();

  if (!data) return null;
  return {
    revenue: data.revenue,
    cogs: data.cogs,
    sga: data.sga,
    nonOperatingIncome: data.non_operating_income,
    nonOperatingExpense: data.non_operating_expense,
  };
}

async function getMonthComparison(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  corpCode: ExecutiveCorpCode,
  yearMonth: string,
): Promise<MonthComparison> {
  const { start, end } = monthDateRange(yearMonth);
  const [system, confirmed] = await Promise.all([
    getSystemProfitLoss({ corpCode, startDate: toYmd(start), endDate: toYmd(end) }),
    getConfirmed(supabase, tenantId, corpCode, yearMonth),
  ]);
  return { yearMonth, systemRevenue: system.revenue, systemSga: system.sga, confirmed };
}

// 확정 자료가 있으면 그걸 대표값으로, 없으면 전산값(매출원가는 알 수 없어 0으로 취급)을 쓴다.
function representative(m: MonthComparison): TrendValues {
  if (m.confirmed && m.confirmed.revenue !== null) {
    const revenue = m.confirmed.revenue ?? 0;
    const cogs = m.confirmed.cogs ?? 0;
    const sga = m.confirmed.sga ?? 0;
    return { revenue, cogs, sga, operatingProfit: revenue - cogs - sga, isEstimate: false };
  }
  return {
    revenue: m.systemRevenue,
    cogs: 0,
    sga: m.systemSga,
    operatingProfit: m.systemRevenue - m.systemSga,
    isEstimate: true,
  };
}

async function getPeriodTotals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  corpCode: ExecutiveCorpCode,
  months: string[],
): Promise<PeriodTotals> {
  const comparisons = await Promise.all(months.map((m) => getMonthComparison(supabase, tenantId, corpCode, m)));
  let revenue = 0;
  let cogs = 0;
  let sga = 0;
  let hasEstimatedMonths = false;

  let confirmedRevenue = 0;
  let confirmedCogs = 0;
  let confirmedSga = 0;
  let monthsWithConfirmed = 0;

  for (const c of comparisons) {
    const r = representative(c);
    revenue += r.revenue;
    cogs += r.cogs;
    sga += r.sga;
    if (r.isEstimate) hasEstimatedMonths = true;

    if (c.confirmed && c.confirmed.revenue !== null) {
      confirmedRevenue += c.confirmed.revenue ?? 0;
      confirmedCogs += c.confirmed.cogs ?? 0;
      confirmedSga += c.confirmed.sga ?? 0;
      monthsWithConfirmed += 1;
    }
  }

  return {
    revenue,
    cogs,
    sga,
    operatingProfit: revenue - cogs - sga,
    hasEstimatedMonths,
    confirmedOnly:
      monthsWithConfirmed === 0
        ? null
        : {
            revenue: confirmedRevenue,
            cogs: confirmedCogs,
            sga: confirmedSga,
            operatingProfit: confirmedRevenue - confirmedCogs - confirmedSga,
            monthsWithConfirmed,
            totalMonths: months.length,
          },
  };
}

function monthsFromJanTo(yearMonth: string): string[] {
  const [, m] = yearMonth.split("-").map(Number);
  const year = yearMonth.split("-")[0];
  return Array.from({ length: m }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

export async function getProfitLoss(corpCode: ExecutiveCorpCode, yearMonth: string): Promise<ProfitLossData | null> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self || !canView(self.team, self.role)) return null;

  const previousMonthKey = shiftMonth(yearMonth, -1);
  const lastYearMonthKey = shiftMonth(yearMonth, -12);
  const lastYearYtdEndKey = lastYearMonthKey;

  const [current, previousMonth, lastYearSameMonth, ytd, lastYearYtd] = await Promise.all([
    getMonthComparison(supabase, self.tenantId, corpCode, yearMonth),
    getMonthComparison(supabase, self.tenantId, corpCode, previousMonthKey),
    getMonthComparison(supabase, self.tenantId, corpCode, lastYearMonthKey),
    getPeriodTotals(supabase, self.tenantId, corpCode, monthsFromJanTo(yearMonth)),
    getPeriodTotals(supabase, self.tenantId, corpCode, monthsFromJanTo(lastYearYtdEndKey)),
  ]);

  const trend = {
    current: representative(current),
    previousMonth: representative(previousMonth),
    lastYearSameMonth: representative(lastYearSameMonth),
  };

  return { corpCode, current, previousMonth, lastYearSameMonth, trend, ytd, lastYearYtd };
}

export type ExportResult = { ok: true; base64: string; fileName: string } | { ok: false; message: string };

export async function exportProfitLossExcel(corpCode: ExecutiveCorpCode, yearMonth: string): Promise<ExportResult> {
  const data = await getProfitLoss(corpCode, yearMonth);
  if (!data) return { ok: false, message: "조회 권한이 없거나 데이터를 불러올 수 없습니다." };

  const corpName = EXECUTIVE_PL_CORPS.find((c) => c.corpCode === corpCode)?.corpName ?? corpCode;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`${corpName} 손익`);

  ws.addRow([`${corpName} 손익자료 (${yearMonth})`]);
  ws.addRow([]);
  ws.addRow(["구분", "전산", "확정(회계팀)", "차이"]);
  const opConfirmed =
    data.current.confirmed && data.current.confirmed.revenue !== null
      ? (data.current.confirmed.revenue ?? 0) - (data.current.confirmed.cogs ?? 0) - (data.current.confirmed.sga ?? 0)
      : null;
  const opSystem = data.current.systemRevenue - data.current.systemSga;
  const lines: [string, number | null, number | null][] = [
    ["매출", data.current.systemRevenue, data.current.confirmed?.revenue ?? null],
    ["매출원가", null, data.current.confirmed?.cogs ?? null],
    ["판관비", data.current.systemSga, data.current.confirmed?.sga ?? null],
    ["영업이익", opSystem, opConfirmed],
  ];
  for (const [label, system, confirmed] of lines) {
    const diff = system !== null && confirmed !== null ? confirmed - system : null;
    ws.addRow([label, system, confirmed, diff]);
  }

  ws.addRow([]);
  ws.addRow(["월누적(YTD)", "당해", `당해 확정(회계팀, ${yearMonth.slice(0, 4)}년)`, "전년"]);
  ws.addRow(["매출", data.ytd.revenue, data.ytd.confirmedOnly?.revenue ?? null, data.lastYearYtd.revenue]);
  ws.addRow(["매출원가", data.ytd.cogs, data.ytd.confirmedOnly?.cogs ?? null, data.lastYearYtd.cogs]);
  ws.addRow(["판관비", data.ytd.sga, data.ytd.confirmedOnly?.sga ?? null, data.lastYearYtd.sga]);
  ws.addRow([
    "영업이익",
    data.ytd.operatingProfit,
    data.ytd.confirmedOnly?.operatingProfit ?? null,
    data.lastYearYtd.operatingProfit,
  ]);

  ws.getRow(1).font = { bold: true, size: 13 };
  ws.getRow(3).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 16));

  const buffer = await wb.xlsx.writeBuffer();
  return { ok: true, base64: Buffer.from(buffer).toString("base64"), fileName: `${corpName}_손익자료_${yearMonth}.xlsx` };
}

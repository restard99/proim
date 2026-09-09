"use server";

import { createClient } from "@/lib/supabase/server";
import { EXECUTIVE_CORPS, type ExecutiveCorpCode } from "@/lib/yerp/executive-corps";
import { getSalesTotalByCorp, getSalesByCustomer, type ExecutiveCustomerSales } from "@/lib/yerp/executive-sales";
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

function daysInMonthOf(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// 주간계획은 워크북의 성긴 일자별 표에 그 주 보고서가 실제로 만들어진 날에만 값이 있어서
// 믿을 수 없다(안 만들어진 주는 비어 있고, 달을 걸치는 주는 한쪽 달만 반영해 값이 틀린
// 사례도 확인됨 — 8/31~9/6 주는 원본이 9월 몫만 반영하고 8/31 하루치를 빠뜨림). 그래서
// 주간계획은 원본 값을 아예 쓰지 않고, 그 주에 속한 7일 각각이 속한 달의 "월간계획 ÷ 그
// 달 일수"를 날짜별로 더해 항상 직접 계산한다(달을 안 걸치는 보통의 주는 결국
// 월간계획÷일수×7과 같은 값이 된다).
function computeWeekPlanFromMonthly(weekStartDate: string, monthPlanByKey: Map<string, number> | undefined): number | null {
  if (!monthPlanByKey) return null;
  let total = 0;
  let hasAny = false;
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStartDate, i);
    const monthKey = day.slice(0, 7);
    const monthPlan = monthPlanByKey.get(monthKey);
    if (monthPlan === undefined) continue;
    total += monthPlan / daysInMonthOf(monthKey);
    hasAny = true;
  }
  return hasAny ? total : null;
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
  salesWeek: Map<string, number>; // corpCode -> value (워크북에 명시된 그 주 값 — 달을 걸치는 주는 파서에서 이미 두 조각을 더해 둠)
  salesMonthByKey: Map<string, Map<string, number>>; // corpCode -> monthKey('YYYY-MM') -> value
  productionWeek: Map<string, number>; // category -> value
};

// monthKeys는 보통 한 달(주가 한 달 안에 다 들어가는 경우)이지만, 8/31~9/6처럼 주가 두 달에
// 걸치면 두 달 다 넘어온다 — 워크북에 그 주 값이 아예 없을 때(아직 보고서가 안 만들어진
// 진행 중인 주 등) 월간계획으로 대체 계산하려면 걸쳐 있는 두 달의 월간계획이 다 필요하다.
async function loadTargets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  weekStartDate: string,
  monthKeys: string[],
): Promise<TargetLookup> {
  const monthClauses = monthKeys.map((mk) => `and(period_type.eq.month,period_key.eq.${mk})`).join(",");
  const { data } = await supabase
    .from("executive_targets")
    .select("metric, corp_code, category, period_type, period_key, target_value")
    .eq("tenant_id", tenantId)
    .or(`and(period_type.eq.week,period_key.eq.${weekStartDate}),${monthClauses}`);

  const salesWeek = new Map<string, number>();
  const salesMonthByKey = new Map<string, Map<string, number>>();
  const productionWeek = new Map<string, number>();

  for (const row of data ?? []) {
    if (row.metric === "sales" && row.corp_code) {
      if (row.period_type === "week") {
        salesWeek.set(row.corp_code, Number(row.target_value));
      } else if (row.period_type === "month") {
        if (!salesMonthByKey.has(row.corp_code)) salesMonthByKey.set(row.corp_code, new Map());
        salesMonthByKey.get(row.corp_code)!.set(row.period_key, Number(row.target_value));
      }
    } else if (row.metric === "production" && row.category && row.period_type === "week") {
      productionWeek.set(row.category, Number(row.target_value));
    }
  }

  return { salesWeek, salesMonthByKey, productionWeek };
}

export type SeomdeulchaeUnitReportRow = {
  businessUnit: string;
  weekPlan: number | null;
  weekActual: number | null;
  monthPlan: number | null;
  monthActual: number | null;
};

// 섬들채 업장별 목표(계획)는 워크북 업로드로 채워진 executive_seomdeulchae_unit_target에서
// 조회하는 주/월과 정확히 일치하는 기간을 그대로 찾는다(워크북 한 번 업로드로 과거 모든
// 주/월이 다 채워지므로, executive_targets의 법인별 목표 조회와 똑같이 "정확히 그 기간" 매칭이면
// 충분하다). 박물관은 업장이 아니라 별도 법인이라 executive_targets(corp_code='0440')에서
// 가져온다. 실적은 POS 원시 판매 데이터(executive_seomdeulchae_sales_raw)에서 그때그때
// 주간/월누적(월초~조회주 마지막날)으로 직접 집계한다 — 계획과 실적을 서로 다른 업로드가
// 채우기 때문에 조회 시점에 합친다. "전체"(합계)는 원본에 그런 업장이 없어(POS 대분류가
// 6개 실제 업장뿐) 그 6개를 직접 더해서 만든다.
const SEOMDEULCHAE_UNITS = ["소금가게", "택배/쇼핑몰", "소금아이스크림", "해양힐링센터", "카라반", "소금항카페"] as const;

async function sumNetAmountByUnit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from("executive_seomdeulchae_sales_raw")
    .select("business_unit, net_amount")
    .eq("tenant_id", tenantId)
    .gte("sale_date", startDate)
    .lte("sale_date", endDate);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.business_unit, (map.get(row.business_unit) ?? 0) + Number(row.net_amount));
  }
  return map;
}

// 태평염전 Y-ERP 매출 반영이 실제보다 늦어(사용자 확인) 워크북에 수기로 올라오는 일별
// 매출실적(executive_taepyeong_yeomjeon_sales_daily)을 대신 쓴다. 그 범위에 업로드된 값이
// 하나도 없으면(아직 안 올라온 최신 기간이 아니라 애초에 이 트래킹 이전의 옛날 기간) null을
// 반환해서, 호출 측이 예전처럼 Y-ERP 값으로 대체할 수 있게 한다.
async function sumTaepyeongYeomjeonDailySales(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("executive_taepyeong_yeomjeon_sales_daily")
    .select("amount")
    .eq("tenant_id", tenantId)
    .gte("sale_date", startDate)
    .lte("sale_date", endDate);

  if (!data || data.length === 0) return null;
  return data.reduce((s, r) => s + Number(r.amount), 0);
}

export type TopSellingProduct = {
  productCode: string;
  productName: string;
  weekQty: number;
  weekAmount: number;
  monthQty: number;
  monthAmount: number;
};

type ProductAgg = { productCode: string; productName: string; qty: number; amount: number };

async function sumByProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<Map<string, ProductAgg>> {
  const { data } = await supabase
    .from("executive_seomdeulchae_sales_raw")
    .select("product_code, product_name, qty, net_amount")
    .eq("tenant_id", tenantId)
    .in("business_unit", SEOMDEULCHAE_UNITS)
    .gte("sale_date", startDate)
    .lte("sale_date", endDate);

  const map = new Map<string, ProductAgg>();
  for (const row of data ?? []) {
    const existing = map.get(row.product_code);
    if (existing) {
      existing.qty += Number(row.qty ?? 0);
      existing.amount += Number(row.net_amount);
    } else {
      map.set(row.product_code, {
        productCode: row.product_code,
        productName: row.product_name ?? row.product_code,
        qty: Number(row.qty ?? 0),
        amount: Number(row.net_amount),
      });
    }
  }
  return map;
}

// 섬들채 6페이지 하단의 "판매상품별 매출상위" — 한 표에 주간/월간을 같이 보여주기 위해
// 월간 누적 실매출액 기준 상위 N개를 고르고, 그 상품들의 주간 실적을 같이 붙인다(6개 업장
// 전체 합산 — 박물관은 별도 법인이라 제외). 이번 주에 안 팔렸으면 주간 값은 0이 된다.
async function getTopSellingProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  weekStartDate: string,
  weekEndDate: string,
  monthStartDate: string,
  limit = 10,
): Promise<TopSellingProduct[]> {
  const [weekMap, monthMap] = await Promise.all([
    sumByProduct(supabase, tenantId, weekStartDate, weekEndDate),
    sumByProduct(supabase, tenantId, monthStartDate, weekEndDate),
  ]);

  const topMonth = [...monthMap.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
  return topMonth.map((m) => {
    const w = weekMap.get(m.productCode);
    return {
      productCode: m.productCode,
      productName: m.productName,
      weekQty: w?.qty ?? 0,
      weekAmount: w?.amount ?? 0,
      monthQty: m.qty,
      monthAmount: m.amount,
    };
  });
}

async function loadSeomdeulchaeUnitReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  weekStartDate: string,
  weekEndDate: string,
  monthStartDate: string,
): Promise<SeomdeulchaeUnitReportRow[] | null> {
  const monthKey = monthStartDate.slice(0, 7);

  const [unitPlanRows, museumPlanRows, weekActualMap, monthActualMap] = await Promise.all([
    supabase
      .from("executive_seomdeulchae_unit_target")
      .select("business_unit, period_type, target_value")
      .eq("tenant_id", tenantId)
      .in("business_unit", SEOMDEULCHAE_UNITS)
      .or(`and(period_type.eq.week,period_key.eq.${weekStartDate}),and(period_type.eq.month,period_key.eq.${monthKey})`)
      .then((r) => r.data ?? []),
    supabase
      .from("executive_targets")
      .select("period_type, target_value")
      .eq("tenant_id", tenantId)
      .eq("metric", "sales")
      .eq("corp_code", "0440")
      .or(`and(period_type.eq.week,period_key.eq.${weekStartDate}),and(period_type.eq.month,period_key.eq.${monthKey})`)
      .then((r) => r.data ?? []),
    sumNetAmountByUnit(supabase, tenantId, weekStartDate, weekEndDate),
    sumNetAmountByUnit(supabase, tenantId, monthStartDate, weekEndDate),
  ]);

  const unitWeekPlan = new Map<string, number>();
  const unitMonthPlan = new Map<string, number>();
  for (const r of unitPlanRows) {
    const map = r.period_type === "week" ? unitWeekPlan : unitMonthPlan;
    map.set(r.business_unit as string, Number(r.target_value));
  }
  const museumWeekPlan = museumPlanRows.find((r) => r.period_type === "week")?.target_value ?? null;
  const museumMonthPlan = museumPlanRows.find((r) => r.period_type === "month")?.target_value ?? null;

  if (
    unitWeekPlan.size === 0 &&
    unitMonthPlan.size === 0 &&
    museumWeekPlan === null &&
    museumMonthPlan === null &&
    weekActualMap.size === 0 &&
    monthActualMap.size === 0
  ) {
    return null;
  }

  function buildRow(unit: string, weekPlan: number | null, monthPlan: number | null): SeomdeulchaeUnitReportRow {
    return {
      businessUnit: unit,
      weekPlan,
      weekActual: weekActualMap.has(unit) ? (weekActualMap.get(unit) as number) : null,
      monthPlan,
      monthActual: monthActualMap.has(unit) ? (monthActualMap.get(unit) as number) : null,
    };
  }

  const unitRows = SEOMDEULCHAE_UNITS.map((u) => buildRow(u, unitWeekPlan.get(u) ?? null, unitMonthPlan.get(u) ?? null));
  const sumIfAny = (pick: (r: SeomdeulchaeUnitReportRow) => number | null) =>
    unitRows.some((r) => pick(r) !== null) ? unitRows.reduce((s, r) => s + (pick(r) ?? 0), 0) : null;
  // 박물관은 별도 법인이라 합계(전체)에 넣지 않는다 — unitRows(6개 실제 업장)만 더한다.
  const totalRow: SeomdeulchaeUnitReportRow = {
    businessUnit: "전체",
    weekPlan: sumIfAny((r) => r.weekPlan),
    weekActual: sumIfAny((r) => r.weekActual),
    monthPlan: sumIfAny((r) => r.monthPlan),
    monthActual: sumIfAny((r) => r.monthActual),
  };

  // 표시 순서는 PPT 원본과 동일하게 "업장 6개 → 합계 → 박물관"으로 맞춘다.
  return [
    ...unitRows,
    totalRow,
    buildRow("박물관", museumWeekPlan === null ? null : Number(museumWeekPlan), museumMonthPlan === null ? null : Number(museumMonthPlan)),
  ];
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
  page6: {
    units: SeomdeulchaeUnitReportRow[];
    topProducts: TopSellingProduct[];
  } | null;
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

  // 주가 두 달에 걸치면(예: 8/31 월요일 시작 ~ 9/6 일요일) 두 달의 월간계획이 다 필요하다.
  const startMonthKey = weekStartDate.slice(0, 7);
  const endMonthKey = weekEndDate.slice(0, 7);
  const monthKeys = startMonthKey === endMonthKey ? [startMonthKey] : [startMonthKey, endMonthKey];
  const targets = await loadTargets(supabase, self.tenantId, weekStartDate, monthKeys);

  const corpCodes = EXECUTIVE_CORPS.map((c) => c.corpCode);
  const [
    weekTotals,
    monthTotals,
    lastYearTotals,
    page2Customers,
    page5Customers,
    seomdeulchaeUnits,
    topProducts,
    page4Prod,
    page4ProdMonth,
    page4ProdLastYear,
    yeomjeonWeekActual,
    yeomjeonMonthActual,
  ] = await Promise.all([
    getSalesTotalByCorp({ corpCodes, startDate: weekStartYmd, endDate: weekEndYmd }),
    getSalesTotalByCorp({ corpCodes, startDate: monthToDateStart, endDate: monthToDateEnd }),
    getSalesTotalByCorp({ corpCodes, startDate: lastYearMonthStartYmd, endDate: lastYearMonthEndYmd }),
    getSalesByCustomer({ corpCode: "0400", startDate: weekStartYmd, endDate: weekEndYmd }),
    getSalesByCustomer({ corpCode: "0460", startDate: weekStartYmd, endDate: weekEndYmd }),
    loadSeomdeulchaeUnitReport(supabase, self.tenantId, weekStartDate, weekEndDate, month.start),
    getTopSellingProducts(supabase, self.tenantId, weekStartDate, weekEndDate, month.start),
    getTaepyeongSogeumProduction({ startDate: weekStartYmd, endDate: weekEndYmd }),
    getTaepyeongSogeumProduction({ startDate: monthToDateStart, endDate: monthToDateEnd }),
    getTaepyeongSogeumProduction({ startDate: lastYearMonthStartYmd, endDate: lastYearMonthEndYmd }),
    sumTaepyeongYeomjeonDailySales(supabase, self.tenantId, weekStartDate, weekEndDate),
    sumTaepyeongYeomjeonDailySales(supabase, self.tenantId, month.start, weekEndDate),
  ]);

  const [page2Month, page5Month] = await Promise.all([
    getSalesByCustomer({ corpCode: "0400", startDate: monthToDateStart, endDate: monthToDateEnd }),
    getSalesByCustomer({ corpCode: "0460", startDate: monthToDateStart, endDate: monthToDateEnd }),
  ]);

  const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

  const page1Corps: WeeklyReportPage1Corp[] = EXECUTIVE_CORPS.map((c) => {
    const monthPlanByKey = targets.salesMonthByKey.get(c.corpCode);
    // 태평염전은 Y-ERP 반영이 실제보다 늦어서(사용자 확인) 워크북에 수기로 올라오는 일별
    // 매출실적을 우선 쓰고, 그 범위에 아직 업로드된 값이 없을 때만(트래킹 이전의 옛 기간)
    // 예전처럼 Y-ERP 값으로 대체한다.
    const isYeomjeon = c.corpCode === "0400";
    return {
      corpCode: c.corpCode,
      corpName: c.corpName,
      // 워크북에 그 주 값이 있으면(달을 걸치는 주는 파서가 이미 두 조각을 더해 둠) 그대로
      // 쓰고, 아직 보고서가 안 만들어진 진행 중인 주처럼 값이 아예 없을 때만 월간계획
      // 기반으로 대체 계산한다.
      weekPlan: targets.salesWeek.get(c.corpCode) ?? computeWeekPlanFromMonthly(weekStartDate, monthPlanByKey),
      weekActual: (isYeomjeon ? yeomjeonWeekActual : null) ?? weekTotals.find((t) => t.corpCode === c.corpCode)?.total ?? 0,
      monthPlan: monthPlanByKey?.get(startMonthKey) ?? null,
      monthActual: (isYeomjeon ? yeomjeonMonthActual : null) ?? monthTotals.find((t) => t.corpCode === c.corpCode)?.total ?? 0,
      lastYearMonthActual: lastYearTotals.find((t) => t.corpCode === c.corpCode)?.total ?? 0,
    };
  });

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
    page6: seomdeulchaeUnits ? { units: seomdeulchaeUnits, topProducts } : null,
  };
}

// 기간(월 범위) 실적 합산 조회 — 계획은 주/월 단위 스냅샷이라 임의 범위에 합산하는 게 의미가
// 없어서 제외하고, 실적만 범위 그대로 합산해 보여준다. 대부분의 실적 조회 함수(Y-ERP 매출/생산
// 조회, 섬들채 원시 판매 집계)가 원래부터 임의 시작일~종료일을 받도록 만들어져 있어 그대로
// 재사용한다. 태평염전 생산(saltfield_production_records)만 예외로, 그 테이블은 날짜별
// daily_total이 실제 그날 생산량이라 범위 안 날짜들의 daily_total을 직접 더하면 된다(주간/월간
// 계획·누적 컬럼은 특정 시점 스냅샷이라 범위 합산에 못 쓴다).
async function sumSaltfieldDailyTotal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("saltfield_production_records")
    .select("daily_total")
    .eq("tenant_id", tenantId)
    .gte("record_date", startDate)
    .lte("record_date", endDate);

  if (!data || data.length === 0) return null;
  return data.reduce((s, r) => s + Number(r.daily_total ?? 0), 0);
}

export type RangeTopProduct = { productCode: string; productName: string; qty: number; amount: number };

export type RangeActualsReport = {
  rangeStart: string;
  rangeEnd: string;
  page1: { corpCode: ExecutiveCorpCode; corpName: string; actual: number }[];
  page2: { customers: ExecutiveCustomerSales[]; actual: number };
  page3: { actual: number | null };
  page4: { category: "천일염" | "가공염"; actual: number }[];
  page5: { customers: ExecutiveCustomerSales[]; actual: number };
  page6: {
    units: { businessUnit: string; actual: number }[];
    topProducts: RangeTopProduct[];
  } | null;
};

export async function getRangeActualsReport(rangeStart: string, rangeEnd: string): Promise<RangeActualsReport | null> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self || !canViewReport(self.team, self.role)) return null;

  const startYmd = toYmd(rangeStart);
  const endYmd = toYmd(rangeEnd);
  const corpCodes = EXECUTIVE_CORPS.map((c) => c.corpCode);

  const [corpTotals, page2Customers, page5Customers, prodByCategory, saltfieldActual, unitActualMap, productMap] =
    await Promise.all([
      getSalesTotalByCorp({ corpCodes, startDate: startYmd, endDate: endYmd }),
      getSalesByCustomer({ corpCode: "0400", startDate: startYmd, endDate: endYmd }),
      getSalesByCustomer({ corpCode: "0460", startDate: startYmd, endDate: endYmd }),
      getTaepyeongSogeumProduction({ startDate: startYmd, endDate: endYmd }),
      sumSaltfieldDailyTotal(supabase, self.tenantId, rangeStart, rangeEnd),
      sumNetAmountByUnit(supabase, self.tenantId, rangeStart, rangeEnd),
      sumByProduct(supabase, self.tenantId, rangeStart, rangeEnd),
    ]);

  const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

  const page1 = EXECUTIVE_CORPS.map((c) => ({
    corpCode: c.corpCode,
    corpName: c.corpName,
    actual: corpTotals.find((t) => t.corpCode === c.corpCode)?.total ?? 0,
  }));

  const page6HasData = unitActualMap.size > 0;
  const page6 = page6HasData
    ? {
        units: [
          ...SEOMDEULCHAE_UNITS.map((u) => ({ businessUnit: u, actual: unitActualMap.get(u) ?? 0 })),
          {
            businessUnit: "전체",
            actual: SEOMDEULCHAE_UNITS.reduce((s, u) => s + (unitActualMap.get(u) ?? 0), 0),
          },
          { businessUnit: "박물관", actual: unitActualMap.get("박물관") ?? 0 },
        ],
        topProducts: [...productMap.values()]
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10)
          .map((p) => ({ productCode: p.productCode, productName: p.productName, qty: p.qty, amount: p.amount })),
      }
    : null;

  return {
    rangeStart,
    rangeEnd,
    page1,
    page2: { customers: page2Customers, actual: sum(page2Customers) },
    page3: { actual: saltfieldActual },
    page4: prodByCategory.map((p) => ({ category: p.category, actual: p.qtyKg })),
    page5: { customers: page5Customers, actual: sum(page5Customers) },
    page6,
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

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getSalesPeriodData, type SalesPeriodData } from "@/app/actions/sales";
import { getYearlyProgress, type YearlyProgress } from "@/app/actions/sales-targets";

type PeriodType = "weekly" | "monthly" | "mtd" | "custom" | "yearly";
type CompareBasis = "prev-week" | "prev-month" | "prev-year";

const PERIOD_TABS: { type: PeriodType; label: string }[] = [
  { type: "weekly", label: "주간" },
  { type: "monthly", label: "월간" },
  { type: "mtd", label: "월누적" },
  { type: "custom", label: "기간지정" },
  { type: "yearly", label: "연간목표대비" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toYmd(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseDateInputValue(v: string) {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDot(d: Date) {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
function formatWon(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}
function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}
function addDays(d: Date, n: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export function SalesByCustomerView() {
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<PeriodType>("weekly");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [monthValue, setMonthValue] = useState(() => `${today.getFullYear()}-${pad(today.getMonth() + 1)}`);
  const [customStart, setCustomStart] = useState(() => toDateInputValue(addDays(today, -6)));
  const [customEnd, setCustomEnd] = useState(() => toDateInputValue(today));
  const [year, setYear] = useState(today.getFullYear());
  const [compareBasis, setCompareBasis] = useState<CompareBasis>("prev-week");
  const [search, setSearch] = useState("");

  const [data, setData] = useState<SalesPeriodData | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyProgress | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentRange = useMemo(() => {
    if (period === "weekly") return { start: weekStart, end: addDays(weekStart, 6) };
    if (period === "custom") {
      const start = parseDateInputValue(customStart);
      const end = parseDateInputValue(customEnd);
      return start <= end ? { start, end } : { start: end, end: start };
    }
    const [y, m] = monthValue.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);
    if (period === "mtd") {
      const isCurrentMonth = y === today.getFullYear() && m === today.getMonth() + 1;
      return { start: new Date(y, 0, 1), end: isCurrentMonth ? today : monthEnd };
    }
    return { start: monthStart, end: monthEnd };
  }, [period, weekStart, monthValue, customStart, customEnd, today]);

  const compareRange = useMemo(() => {
    if (compareBasis === "prev-week") {
      return { start: addDays(currentRange.start, -7), end: addDays(currentRange.end, -7) };
    }
    if (compareBasis === "prev-month") {
      const start = new Date(currentRange.start);
      start.setMonth(start.getMonth() - 1);
      const end = new Date(currentRange.end);
      end.setMonth(end.getMonth() - 1);
      return { start, end };
    }
    const start = new Date(currentRange.start);
    start.setFullYear(start.getFullYear() - 1);
    const end = new Date(currentRange.end);
    end.setFullYear(end.getFullYear() - 1);
    return { start, end };
  }, [currentRange, compareBasis]);

  const startYmd = toYmd(currentRange.start);
  const endYmd = toYmd(currentRange.end);
  const compareStartYmd = toYmd(compareRange.start);
  const compareEndYmd = toYmd(compareRange.end);

  function runQuery() {
    if (period === "yearly") {
      startTransition(async () => {
        const result = await getYearlyProgress(year);
        setYearlyData(result);
      });
      return;
    }
    startTransition(async () => {
      const result = await getSalesPeriodData({
        startDate: startYmd,
        endDate: endYmd,
        compareStartDate: compareStartYmd,
        compareEndDate: compareEndYmd,
        search: search || undefined,
      });
      setData(result);
    });
  }

  // 탭을 바꾸면 그 탭의 기본 조회 조건으로 바로 조회한다.
  // 날짜/비교기준/검색어 등 세부 조건 변경은 "검색" 버튼을 눌러야 반영된다.
  useEffect(() => {
    runQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const card1Label =
    period === "weekly"
      ? "이번 주 매출 합계"
      : period === "monthly"
        ? "이번 달 매출 합계"
        : period === "mtd"
          ? "연초 누적 매출"
          : "선택 기간 매출 합계";
  const tableColLabel =
    period === "weekly"
      ? "주간 매출액"
      : period === "monthly"
        ? "월간 매출액"
        : period === "mtd"
          ? "월누적 매출액"
          : "매출액";
  const compareLabel =
    compareBasis === "prev-week" ? "전주 대비" : compareBasis === "prev-month" ? "전월 대비" : "전년 동기 대비";

  const compareRate =
    data && data.compareTotal !== null && data.compareTotal !== 0
      ? (((data.total - data.compareTotal) / data.compareTotal) * 100).toFixed(1)
      : null;

  const yearlyPct =
    yearlyData && yearlyData.targetTotal > 0
      ? Math.min(100, (yearlyData.achievedTotal / yearlyData.targetTotal) * 100)
      : null;

  return (
    <div className="max-w-6xl space-y-5 px-5 py-8 lg:px-8">
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-mist bg-white p-1">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => setPeriod(tab.type)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              period === tab.type ? "bg-ink text-salt" : "text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {period === "weekly" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="text-muted hover:text-inktext"
              aria-label="이전 주"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12.7 4.3a1 1 0 0 1 0 1.4L8.42 10l4.3 4.3a1 1 0 0 1-1.42 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z"
                />
              </svg>
            </button>
            <span className="text-sm font-medium text-inktext">
              {formatDot(currentRange.start)} (월) ~ {formatDot(currentRange.end)} (일)
            </span>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="text-muted hover:text-inktext"
              aria-label="다음 주"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7.3 15.7a1 1 0 0 1 0-1.4L11.58 10l-4.3-4.3a1 1 0 0 1 1.42-1.4l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4 0Z"
                />
              </svg>
            </button>
          </div>
        )}
        {(period === "monthly" || period === "mtd") && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">월</label>
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
            />
            {period === "mtd" && <span className="text-xs text-muted">연초 1월 1일 ~ 선택월(오늘) 누적</span>}
          </div>
        )}
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">조회기간</label>
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
            />
            <span className="text-sm text-muted">~</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
            />
          </div>
        )}
        {period === "yearly" && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">연도</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
            >
              {[today.getFullYear(), today.getFullYear() - 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {period !== "yearly" && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">비교 기준</label>
            <select
              value={compareBasis}
              onChange={(e) => setCompareBasis(e.target.value as CompareBasis)}
              className="rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
            >
              <option value="prev-week">전주 대비</option>
              <option value="prev-month">전월 대비</option>
              <option value="prev-year">전년 동기 대비</option>
            </select>
          </div>
        )}
        {period !== "yearly" && (
          <div className="flex min-w-[200px] flex-1 items-center gap-2">
            <label className="text-sm text-muted">거래처 검색</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runQuery();
              }}
              placeholder="거래처명"
              className="flex-1 rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
            />
          </div>
        )}
        <button
          type="button"
          onClick={runQuery}
          disabled={isPending}
          className="rounded-md bg-crimson px-4 py-2 text-sm font-medium text-salt transition-colors hover:bg-crimsond disabled:opacity-50"
        >
          검색
        </button>
      </div>

      {period !== "yearly" ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-mist bg-white p-4">
              <p className="text-xs text-muted">{card1Label}</p>
              <p className="mt-1 text-xl font-semibold text-inktext">{formatWon(data?.total ?? 0)}</p>
            </div>
            <div className="rounded-lg border border-mist bg-white p-4">
              <p className="text-xs text-muted">거래처 수</p>
              <p className="mt-1 text-xl font-semibold text-inktext">{data?.customerCount ?? 0}곳</p>
            </div>
            <div className="hidden rounded-lg border border-mist bg-white p-4 sm:block">
              <p className="text-xs text-muted">{compareLabel}</p>
              <p
                className={`mt-1 text-xl font-semibold ${
                  compareRate === null ? "text-muted" : Number(compareRate) >= 0 ? "text-brine" : "text-crimsond"
                }`}
              >
                {compareRate === null ? "—" : `${Number(compareRate) >= 0 ? "+" : ""}${compareRate}%`}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-mist bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">거래처</th>
                  <th className="px-4 py-3 text-right font-medium">{tableColLabel}</th>
                  <th className="px-4 py-3 text-right font-medium">최근 거래일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {(data?.rows ?? []).map((row) => (
                  <tr key={row.customerCode}>
                    <td className="px-4 py-3.5 font-medium">{row.customerName}</td>
                    <td className="px-4 py-3.5 text-right font-mono">{Math.round(row.amount).toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-muted">{row.lastTradeDate ?? "-"}</td>
                  </tr>
                ))}
                {!isPending && (data?.rows.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted">
                      해당 기간 매출 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-5 rounded-lg border border-mist bg-white p-5">
          {yearlyData && yearlyPct !== null ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-inktext">{year}년 전체 목표 대비 진행률</span>
                <span className="text-sm font-semibold text-brine">{yearlyPct.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-mist">
                <div className="h-full rounded-full bg-brine" style={{ width: `${yearlyPct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                목표 {formatWon(yearlyData.targetTotal)} · 누적 {formatWon(yearlyData.achievedTotal)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">
              {year}년 목표가 아직 설정되지 않았습니다. (누적 매출: {formatWon(yearlyData?.achievedTotal ?? 0)})
            </p>
          )}

          {yearlyData && yearlyData.byCustomer.length > 0 && (
            <div className="space-y-4 border-t border-mist pt-2">
              {yearlyData.byCustomer.map((c) => {
                const pct = c.target > 0 ? Math.min(100, (c.achieved / c.target) * 100) : 0;
                return (
                  <div key={c.customerCode}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-inktext">{c.customerName}</span>
                      <span className="font-mono text-xs text-muted">
                        {Math.round(c.achieved).toLocaleString("ko-KR")} / {Math.round(c.target).toLocaleString("ko-KR")}원
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-mist">
                      <div className="h-full rounded-full bg-crimson" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

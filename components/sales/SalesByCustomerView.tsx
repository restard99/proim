"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { getSalesPeriodData, getProductSalesDetail, type SalesPeriodData } from "@/app/actions/sales";
import { getYearlyProgress, type YearlyProgress } from "@/app/actions/sales-targets";
import { groupCustomerSales, type GroupedCustomerSales } from "@/lib/yerp/customer-sort";

type ProductSalesRow = { itemCode: string; itemName: string; qty: number; amount: number };

type PeriodType = "weekly" | "monthly" | "mtd" | "yearly";
type CompareBasis = "prev-week" | "prev-month" | "prev-year";

const PERIOD_TABS: { type: PeriodType; label: string }[] = [
  { type: "weekly", label: "주간" },
  { type: "monthly", label: "월간" },
  { type: "mtd", label: "월누적" },
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
  const [mtdStart, setMtdStart] = useState(() => toDateInputValue(new Date(today.getFullYear(), 0, 1)));
  const [mtdEnd, setMtdEnd] = useState(() => toDateInputValue(today));
  const [year, setYear] = useState(today.getFullYear());
  const [compareBasis, setCompareBasis] = useState<CompareBasis>("prev-week");
  const [search, setSearch] = useState("");

  const [data, setData] = useState<SalesPeriodData | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // 월간/월누적 조회에서 행을 펼쳤을 때 보여줄 업체별 제품 내역(customerCode -> 제품 목록)을
  // 행(key)별로 캐싱해 둔다 — 같은 행을 다시 펼칠 때 재조회하지 않는다.
  const [productDetails, setProductDetails] = useState<Map<string, Record<string, ProductSalesRow[]>>>(new Map());
  const [loadingDetailKeys, setLoadingDetailKeys] = useState<Set<string>>(new Set());

  // 이마트/롯데/지에스 등 센터·지점별로 흩어진 거래처를 브랜드 단위로 합쳐서 보여준다
  // (클릭하면 원래 지점별 내역을 펼쳐볼 수 있음).
  const groupedRows = useMemo(() => groupCustomerSales(data?.rows ?? []), [data]);

  // 월간/월누적만 "업체별 납품 제품명/수량/금액"까지 펼쳐본다(주간은 기존처럼 지점별 금액만).
  const showProductDrilldown = period === "monthly" || period === "mtd";

  const currentRange = useMemo(() => {
    if (period === "weekly") return { start: weekStart, end: addDays(weekStart, 6) };
    if (period === "mtd") {
      const start = parseDateInputValue(mtdStart);
      const end = parseDateInputValue(mtdEnd);
      return start <= end ? { start, end } : { start: end, end: start };
    }
    const [y, m] = monthValue.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);
    return { start: monthStart, end: monthEnd };
  }, [period, weekStart, monthValue, mtdStart, mtdEnd]);

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

  // 행 클릭: 주간에서는 그룹(브랜드)만 펼쳐서 지점별 금액을 보여주고, 월간/월누적에서는
  // 그룹이든 개별 거래처든 펼쳐서 업체별 납품 제품명/수량/금액까지 보여준다.
  function toggleRow(row: GroupedCustomerSales) {
    if (!row.isGroup && !showProductDrilldown) return;

    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(row.key)) next.delete(row.key);
      else next.add(row.key);
      return next;
    });

    if (!showProductDrilldown || productDetails.has(row.key) || loadingDetailKeys.has(row.key)) return;

    const customerCodes = row.isGroup ? row.details.map((d) => d.customerCode) : [row.key];
    setLoadingDetailKeys((prev) => new Set(prev).add(row.key));
    getProductSalesDetail({ startDate: startYmd, endDate: endYmd, customerCodes })
      .then((result) => {
        setProductDetails((prev) => new Map(prev).set(row.key, result));
      })
      .finally(() => {
        setLoadingDetailKeys((prev) => {
          const next = new Set(prev);
          next.delete(row.key);
          return next;
        });
      });
  }

  function runQuery() {
    if (period === "yearly") {
      startTransition(async () => {
        try {
          const result = await getYearlyProgress(year);
          setYearlyData(result);
          setError(null);
        } catch {
          setError("조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
      });
      return;
    }
    startTransition(async () => {
      setExpandedGroups(new Set());
      setProductDetails(new Map());
      try {
        const result = await getSalesPeriodData({
          startDate: startYmd,
          endDate: endYmd,
          compareStartDate: compareStartYmd,
          compareEndDate: compareEndYmd,
          search: search || undefined,
        });
        setData(result);
        setError(null);
      } catch {
        setError("조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  // 탭을 바꾸면 그 탭의 기본 조회 조건으로 바로 조회한다.
  // 날짜/비교기준/검색어 등 세부 조건 변경은 "검색" 버튼을 눌러야 반영된다.
  useEffect(() => {
    runQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const card1Label =
    period === "weekly" ? "이번 주 매출 합계" : period === "monthly" ? "이번 달 매출 합계" : "연초 누적 매출";
  const tableColLabel =
    period === "weekly" ? "주간 매출액" : period === "monthly" ? "월간 매출액" : "월누적 매출액";
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
        {period === "monthly" && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">월</label>
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
            />
          </div>
        )}
        {period === "mtd" && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">조회기간</label>
            <input
              type="date"
              value={mtdStart}
              max={mtdEnd}
              onChange={(e) => setMtdStart(e.target.value)}
              className="rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
            />
            <span className="text-sm text-muted">~</span>
            <input
              type="date"
              value={mtdEnd}
              min={mtdStart}
              onChange={(e) => setMtdEnd(e.target.value)}
              className="rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
            />
            <span className="text-xs text-muted">기본값: 연초 ~ 오늘</span>
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

      {error && <p className="text-sm text-crimsond">{error}</p>}

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
                {groupedRows.map((row) => {
                  const clickable = row.isGroup || showProductDrilldown;
                  const expanded = clickable && expandedGroups.has(row.key);
                  const isLoadingDetail = loadingDetailKeys.has(row.key);
                  const detailByCustomer = productDetails.get(row.key);
                  // 펼쳤을 때 보여줄 "업체" 목록 — 그룹이면 원래 지점들, 개별 거래처면 자기 자신 하나.
                  const companies = row.isGroup
                    ? row.details
                    : [{ customerCode: row.key, customerName: row.displayName, amount: row.amount, lastTradeDate: row.lastTradeDate }];

                  return (
                    <Fragment key={row.key}>
                      <tr
                        onClick={clickable ? () => toggleRow(row) : undefined}
                        className={clickable ? "cursor-pointer hover:bg-mist/20" : undefined}
                      >
                        <td className="px-4 py-3.5 font-medium">
                          {clickable && (
                            <span className="mr-1.5 inline-block text-xs text-muted" aria-hidden>
                              {expanded ? "▾" : "▸"}
                            </span>
                          )}
                          {row.displayName}
                          {row.isGroup && (
                            <span className="ml-1.5 text-xs text-muted">({row.details.length}개 지점)</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono">{Math.round(row.amount).toLocaleString("ko-KR")}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-muted">{row.lastTradeDate ?? "-"}</td>
                      </tr>

                      {expanded && !showProductDrilldown &&
                        row.details.map((d) => (
                          <tr key={d.customerCode} className="bg-mist/10">
                            <td className="py-2.5 pl-10 pr-4 text-xs text-muted">{d.customerName}</td>
                            <td className="py-2.5 pr-4 text-right font-mono text-xs text-muted">
                              {Math.round(d.amount).toLocaleString("ko-KR")}
                            </td>
                            <td className="py-2.5 pr-4 text-right font-mono text-xs text-muted">{d.lastTradeDate ?? "-"}</td>
                          </tr>
                        ))}

                      {expanded && showProductDrilldown && isLoadingDetail && (
                        <tr className="bg-mist/10">
                          <td colSpan={3} className="py-3 pl-10 pr-4 text-xs text-muted">
                            불러오는 중...
                          </td>
                        </tr>
                      )}

                      {expanded && showProductDrilldown && !isLoadingDetail &&
                        companies.map((c) => {
                          const products = detailByCustomer?.[c.customerCode] ?? [];
                          return (
                            <Fragment key={c.customerCode}>
                              <tr className="bg-mist/10">
                                <td colSpan={2} className="py-2 pl-10 pr-4 text-xs font-semibold text-inktext">
                                  {c.customerName}
                                </td>
                                <td className="py-2 pr-4 text-right font-mono text-xs text-muted">
                                  {Math.round(c.amount).toLocaleString("ko-KR")}
                                </td>
                              </tr>
                              {products.length > 0 && (
                                <tr className="bg-mist/10 text-[11px] text-muted">
                                  <td className="py-1 pl-14 pr-4">제품명</td>
                                  <td className="py-1 pr-4 text-right">수량</td>
                                  <td className="py-1 pr-4 text-right">금액</td>
                                </tr>
                              )}
                              {products.length === 0 ? (
                                <tr className="bg-mist/5">
                                  <td colSpan={3} className="py-2 pl-14 pr-4 text-xs text-muted">
                                    제품 내역이 없습니다.
                                  </td>
                                </tr>
                              ) : (
                                products.map((p) => (
                                  <tr key={p.itemCode} className="bg-mist/5">
                                    <td className="py-1.5 pl-14 pr-4 text-xs text-muted">{p.itemName}</td>
                                    <td className="py-1.5 pr-4 text-right font-mono text-xs text-muted">
                                      {p.qty.toLocaleString("ko-KR")}
                                    </td>
                                    <td className="py-1.5 pr-4 text-right font-mono text-xs text-muted">
                                      {Math.round(p.amount).toLocaleString("ko-KR")}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </Fragment>
                          );
                        })}
                    </Fragment>
                  );
                })}
                {!isPending && groupedRows.length === 0 && (
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

"use client";

import { useEffect, useState, useTransition } from "react";
import { getProfitLoss, exportProfitLossExcel, type ProfitLossData } from "@/app/actions/executive-pl";
import {
  getBusinessUnitBreakdown,
  getBusinessUnitBreakdownYtd,
  type BusinessUnitPL,
} from "@/app/actions/executive-pl-business-unit";
import { EXECUTIVE_PL_CORPS, type ExecutiveCorpCode } from "@/lib/yerp/executive-corps";

const SEOMDEULCHAE_CORP: ExecutiveCorpCode = "0360";

function pct(n: number | null) {
  return n === null ? "-" : `${n.toFixed(1)}%`;
}

function won(n: number | null | undefined) {
  if (n === null || n === undefined) return "미입력";
  return Math.round(n).toLocaleString("ko-KR");
}

function diffText(diff: number | null) {
  if (diff === null) return "-";
  const sign = diff > 0 ? "+" : "";
  return `${sign}${Math.round(diff).toLocaleString("ko-KR")}`;
}

function pctText(current: number, base: number) {
  if (base === 0) return "-";
  const rate = ((current - base) / Math.abs(base)) * 100;
  const sign = rate > 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
}

function downloadBase64(base64: string, fileName: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProfitLossView({
  initialCorpCode,
  initialYearMonth,
  initialData,
}: {
  initialCorpCode: ExecutiveCorpCode;
  initialYearMonth: string;
  initialData: ProfitLossData | null;
}) {
  const [corpCode, setCorpCode] = useState(initialCorpCode);
  const [yearMonth, setYearMonth] = useState(initialYearMonth);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [isExporting, startExporting] = useTransition();
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitPL[]>([]);
  const [businessUnitsYtd, setBusinessUnitsYtd] = useState<BusinessUnitPL[]>([]);

  const reload = (nextCorp: ExecutiveCorpCode, nextMonth: string) => {
    startTransition(async () => {
      const result = await getProfitLoss(nextCorp, nextMonth);
      setCorpCode(nextCorp);
      setYearMonth(nextMonth);
      setData(result);
    });
  };

  useEffect(() => {
    if (corpCode !== SEOMDEULCHAE_CORP) return;
    let cancelled = false;
    Promise.all([getBusinessUnitBreakdown(yearMonth), getBusinessUnitBreakdownYtd(yearMonth)]).then(
      ([month, ytd]) => {
        if (!cancelled) {
          setBusinessUnits(month);
          setBusinessUnitsYtd(ytd);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [corpCode, yearMonth]);

  const handleExport = () => {
    startExporting(async () => {
      const result = await exportProfitLossExcel(corpCode, yearMonth);
      if (result.ok) downloadBase64(result.base64, result.fileName);
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="border-b border-mist bg-white px-5 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-2 print:hidden">
        <h1 className="text-lg font-semibold text-inktext">손익자료</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || !data}
            className="flex items-center gap-1.5 rounded-md border border-mist px-3 py-1.5 text-sm text-muted hover:bg-mist/40 disabled:opacity-50"
          >
            엑셀
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md border border-mist px-3 py-1.5 text-sm text-muted hover:bg-mist/40"
          >
            PDF
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl space-y-5 px-5 py-8 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
            <div className="flex gap-5 border-b border-mist">
              {EXECUTIVE_PL_CORPS.map((c) => (
                <button
                  key={c.corpCode}
                  type="button"
                  onClick={() => reload(c.corpCode, yearMonth)}
                  className={`px-1 pb-2 text-sm ${
                    corpCode === c.corpCode ? "border-b-2 border-crimson font-semibold text-inktext" : "text-muted"
                  }`}
                >
                  {c.corpName}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted">조회월</label>
              <input
                type="month"
                value={yearMonth}
                onChange={(e) => reload(corpCode, e.target.value)}
                className="rounded-md border border-mist px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          {isPending && <p className="text-sm text-muted">불러오는 중…</p>}

          {!data ? (
            <div className="rounded-lg border border-mist bg-white px-4 py-10 text-center text-sm text-muted">
              데이터를 불러올 수 없습니다.
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-mist bg-white">
                <div className="border-b border-mist bg-mist/30 px-4 py-2 text-sm font-semibold">
                  ■ {yearMonth} 당월 손익 — 전산(Y-ERP 자동집계) vs 손익추정 [단위: 원]
                </div>
                <table className="w-full grid-table text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">구분</th>
                      <th>전산</th>
                      <th>손익추정</th>
                      <th>차이</th>
                    </tr>
                  </thead>
                  <tbody className="text-center">
                    <PLRow label="매출" system={data.current.systemRevenue} confirmed={data.current.confirmed?.revenue ?? null} />
                    <PLRow label="매출원가" system={null} confirmed={data.current.confirmed?.cogs ?? null} />
                    <PLRow label="판관비" system={data.current.systemSga} confirmed={data.current.confirmed?.sga ?? null} />
                    <PLRow
                      label="영업이익"
                      system={data.current.systemRevenue - data.current.systemSga}
                      confirmed={
                        data.current.confirmed && data.current.confirmed.revenue !== null
                          ? (data.current.confirmed.revenue ?? 0) -
                            (data.current.confirmed.cogs ?? 0) -
                            (data.current.confirmed.sga ?? 0)
                          : null
                      }
                      isTotal
                    />
                  </tbody>
                </table>
                <p className="px-4 py-2 text-xs text-muted">
                  ※ 전산 매출원가는 Y-ERP 일반전표에 기록되지 않아 계산할 수 없습니다. 손익추정 자료가 업로드되지
                  않은 항목은 &ldquo;미입력&rdquo;으로 표시됩니다.
                </p>
              </div>

              <div className="overflow-hidden rounded-lg border border-mist bg-white">
                <div className="border-b border-mist bg-mist/30 px-4 py-2 text-sm font-semibold">
                  ■ 당월 손익 (전월·전년동월 대비, 확정 우선 값) [단위: 원]
                </div>
                <table className="w-full grid-table text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">구분</th>
                      <th>{data.previousMonth.yearMonth}</th>
                      <th>{yearMonth} (당월)</th>
                      <th>전월대비</th>
                      <th>{data.lastYearSameMonth.yearMonth}</th>
                      <th>전년동월대비</th>
                    </tr>
                  </thead>
                  <tbody className="text-center">
                    <TrendRow
                      label="매출"
                      current={data.trend.current.revenue}
                      prevMonth={data.trend.previousMonth.revenue}
                      lastYear={data.trend.lastYearSameMonth.revenue}
                    />
                    <TrendRow
                      label="매출원가"
                      current={data.trend.current.cogs}
                      prevMonth={data.trend.previousMonth.cogs}
                      lastYear={data.trend.lastYearSameMonth.cogs}
                    />
                    <TrendRow
                      label="판관비"
                      current={data.trend.current.sga}
                      prevMonth={data.trend.previousMonth.sga}
                      lastYear={data.trend.lastYearSameMonth.sga}
                    />
                    <TrendRow
                      label="영업이익"
                      current={data.trend.current.operatingProfit}
                      prevMonth={data.trend.previousMonth.operatingProfit}
                      lastYear={data.trend.lastYearSameMonth.operatingProfit}
                      isTotal
                    />
                  </tbody>
                </table>
                {(data.trend.current.isEstimate || data.trend.previousMonth.isEstimate || data.trend.lastYearSameMonth.isEstimate) && (
                  <p className="px-4 py-2 text-xs text-muted">
                    ※ 확정 자료가 없는 달은 전산 매출/판관비만으로 잠정 계산한 값입니다 (매출원가 0으로 취급).
                  </p>
                )}
              </div>

              <div className="overflow-hidden rounded-lg border border-mist bg-white">
                <div className="border-b border-mist bg-mist/30 px-4 py-2 text-sm font-semibold">
                  ■ 월 누적(YTD) 손익 — 전산 vs 손익추정, 전년 대비 [단위: 원]
                </div>
                <table className="w-full grid-table text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">구분</th>
                      <th>{yearMonth.slice(0, 4)}년 전산 누계</th>
                      <th>
                        {yearMonth.slice(0, 4)}년 손익추정 누계
                        {data.ytd.confirmedOnly && data.ytd.confirmedOnly.monthsWithConfirmed < data.ytd.confirmedOnly.totalMonths && (
                          <span className="block font-normal text-[11px] text-muted">
                            {data.ytd.confirmedOnly.monthsWithConfirmed}/{data.ytd.confirmedOnly.totalMonths}개월분
                          </span>
                        )}
                      </th>
                      <th>{data.lastYearSameMonth.yearMonth.slice(0, 4)}년 전산 누계</th>
                      <th>전년대비(전산)</th>
                    </tr>
                  </thead>
                  <tbody className="text-center">
                    <YtdRow
                      label="매출"
                      current={data.ytd.systemOnly.revenue}
                      confirmed={data.ytd.confirmedOnly?.revenue ?? null}
                      lastYear={data.lastYearYtd.systemOnly.revenue}
                    />
                    <YtdRow
                      label="매출원가"
                      current={null}
                      confirmed={data.ytd.confirmedOnly?.cogs ?? null}
                      lastYear={null}
                    />
                    <YtdRow
                      label="판관비"
                      current={data.ytd.systemOnly.sga}
                      confirmed={data.ytd.confirmedOnly?.sga ?? null}
                      lastYear={data.lastYearYtd.systemOnly.sga}
                    />
                    <YtdRow
                      label="영업이익"
                      current={data.ytd.systemOnly.operatingProfit}
                      confirmed={data.ytd.confirmedOnly?.operatingProfit ?? null}
                      lastYear={data.lastYearYtd.systemOnly.operatingProfit}
                      isTotal
                    />
                  </tbody>
                </table>
                <p className="px-4 py-2 text-xs text-muted">
                  ※ &ldquo;전산 누계&rdquo;는 Y-ERP 자동집계만 더한 값(매출원가는 계산 불가)이고, &ldquo;손익추정 누계&rdquo;는 관리자가 업로드한 손익추정 자료가 있는 달만 합산한 값입니다. 서로 다른 두 출처를 나란히 보여드리는 것으로, 하나로 섞은 값이 아닙니다.
                </p>
              </div>

              {corpCode === SEOMDEULCHAE_CORP && (
                <>
                  <BusinessUnitTable title={`■ ${yearMonth} 부문별 손익 [단위: 원]`} rows={businessUnits} />
                  <BusinessUnitTable
                    title={`■ ${yearMonth.slice(0, 4)}년 1~${Number(yearMonth.slice(5, 7))}월 누계 부문별 손익 [단위: 원]`}
                    rows={businessUnitsYtd}
                  />
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function PLRow({
  label,
  system,
  confirmed,
  isTotal,
}: {
  label: string;
  system: number | null;
  confirmed: number | null;
  isTotal?: boolean;
}) {
  const diff = system !== null && confirmed !== null ? confirmed - system : null;
  return (
    <tr className={isTotal ? "total-row" : undefined}>
      <td className="text-left font-sans font-medium text-inktext">{label}</td>
      <td>{won(system)}</td>
      <td>{won(confirmed)}</td>
      <td className={diff !== null && diff < 0 ? "text-crimsond" : diff !== null && diff > 0 ? "text-brine" : undefined}>
        {diffText(diff)}
      </td>
    </tr>
  );
}

function TrendRow({
  label,
  current,
  prevMonth,
  lastYear,
  isTotal,
}: {
  label: string;
  current: number;
  prevMonth: number;
  lastYear: number;
  isTotal?: boolean;
}) {
  return (
    <tr className={isTotal ? "total-row" : undefined}>
      <td className="text-left font-sans font-medium text-inktext">{label}</td>
      <td>{won(prevMonth)}</td>
      <td>{won(current)}</td>
      <td className={current < prevMonth ? "text-crimsond" : "text-brine"}>{pctText(current, prevMonth)}</td>
      <td>{won(lastYear)}</td>
      <td className={current < lastYear ? "text-crimsond" : "text-brine"}>{pctText(current, lastYear)}</td>
    </tr>
  );
}

function YtdRow({
  label,
  current,
  confirmed,
  lastYear,
  isTotal,
}: {
  label: string;
  current: number | null;
  confirmed: number | null;
  lastYear: number | null;
  isTotal?: boolean;
}) {
  const hasComparison = current !== null && lastYear !== null;
  return (
    <tr className={isTotal ? "total-row" : undefined}>
      <td className="text-left font-sans font-medium text-inktext">{label}</td>
      <td>{won(current)}</td>
      <td>{won(confirmed)}</td>
      <td>{won(lastYear)}</td>
      <td className={hasComparison && current < lastYear ? "text-crimsond" : hasComparison ? "text-brine" : undefined}>
        {hasComparison ? pctText(current, lastYear) : "-"}
      </td>
    </tr>
  );
}

function BusinessUnitTable({ title, rows }: { title: string; rows: BusinessUnitPL[] }) {
  const total = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      cogs: acc.cogs + r.cogs,
      grossProfit: acc.grossProfit + r.grossProfit,
      sga: acc.sga + r.sga,
      operatingProfit: acc.operatingProfit + r.operatingProfit,
      pretaxProfit: acc.pretaxProfit + r.pretaxProfit,
    }),
    { revenue: 0, cogs: 0, grossProfit: 0, sga: 0, operatingProfit: 0, pretaxProfit: 0 },
  );
  const totalGrossMarginPct = total.revenue !== 0 ? (total.grossProfit / total.revenue) * 100 : null;
  const totalOperatingMarginPct = total.revenue !== 0 ? (total.operatingProfit / total.revenue) * 100 : null;

  const lines: {
    label: string;
    isTotal?: boolean;
    value: (r: BusinessUnitPL) => number;
    pctValue?: (r: BusinessUnitPL) => number | null;
    totalValue: number;
    totalPct?: number | null;
    negativeRed?: boolean;
  }[] = [
    { label: "매출", value: (r) => r.revenue, totalValue: total.revenue },
    { label: "매출원가", value: (r) => r.cogs, totalValue: total.cogs },
    { label: "매출총이익", value: (r) => r.grossProfit, pctValue: (r) => r.grossMarginPct, totalValue: total.grossProfit, totalPct: totalGrossMarginPct },
    { label: "판관비", value: (r) => r.sga, totalValue: total.sga },
    {
      label: "영업이익",
      value: (r) => r.operatingProfit,
      pctValue: (r) => r.operatingMarginPct,
      totalValue: total.operatingProfit,
      totalPct: totalOperatingMarginPct,
      negativeRed: true,
      isTotal: true,
    },
    { label: "세전이익", value: (r) => r.pretaxProfit, totalValue: total.pretaxProfit, negativeRed: true },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-mist bg-white">
      <div className="border-b border-mist bg-mist/30 px-4 py-2 text-sm font-semibold">{title}</div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          업로드된 부문별 손익이 없습니다. 관리자 페이지에서 &ldquo;섬들채 부문별 손익&rdquo;을 업로드하면 표시됩니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full grid-table text-sm">
            <thead>
              <tr>
                <th className="text-left">구분</th>
                {rows.map((r) => (
                  <th key={r.businessUnit}>{r.businessUnit}</th>
                ))}
                <th>합계</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {lines.map((line) => (
                <tr key={line.label} className={line.isTotal ? "total-row" : undefined}>
                  <td className="text-left font-sans font-medium text-inktext">
                    {line.label}
                    {line.pctValue && <span className="block text-xs text-muted font-sans">(이익률)</span>}
                  </td>
                  {rows.map((r) => (
                    <td key={r.businessUnit} className={line.negativeRed && line.value(r) < 0 ? "text-crimsond" : undefined}>
                      {won(line.value(r))}
                      {line.pctValue && <span className="block text-xs text-muted">{pct(line.pctValue(r))}</span>}
                    </td>
                  ))}
                  <td className={line.negativeRed && line.totalValue < 0 ? "text-crimsond" : undefined}>
                    {won(line.totalValue)}
                    {line.pctValue && <span className="block text-xs text-muted">{pct(line.totalPct ?? null)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getInventoryData, type InventoryData } from "@/app/actions/inventory";
import type { InventoryCategory } from "@/lib/yerp/inventory";

const CATEGORIES: InventoryCategory[] = ["부자재", "완제품", "3자물류"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function firstOfThisMonth() {
  const d = new Date();
  return toDateInputValue(new Date(d.getFullYear(), d.getMonth(), 1));
}
function todayDateValue() {
  return toDateInputValue(new Date());
}
function toYmd(dateInputValue: string) {
  return dateInputValue.replaceAll("-", "");
}
function formatWon(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}
function formatQty(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

export function InventoryView() {
  const [category, setCategory] = useState<InventoryCategory>("부자재");
  const [startDate, setStartDate] = useState(firstOfThisMonth);
  const [endDate, setEndDate] = useState(todayDateValue);
  const [data, setData] = useState<InventoryData | null>(null);
  const [isPending, startTransition] = useTransition();

  const period = useMemo(() => ({ start: toYmd(startDate), end: toYmd(endDate) }), [startDate, endDate]);

  useEffect(() => {
    startTransition(async () => {
      const result = await getInventoryData(category, period);
      setData(result);
    });
  }, [category, period]);

  const totalEndQty = (data?.rows ?? []).reduce((sum, r) => sum + r.endQty, 0);

  return (
    <div className="max-w-7xl space-y-5 px-5 py-8 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-mist bg-white p-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                category === c ? "bg-ink text-salt" : "text-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">조회기간</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          />
          <span className="text-sm text-muted">~</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">기말재고 수량</p>
          <p className="mt-1 text-xl font-semibold text-inktext">{formatQty(totalEndQty)}</p>
        </div>
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">기말재고 금액</p>
          <p className="mt-1 text-xl font-semibold text-inktext">{formatWon(data?.totalEndAmt ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">입고 금액</p>
          <p className="mt-1 text-xl font-semibold text-brine">{formatWon(data?.totalInAmt ?? 0)}</p>
        </div>
        <div className="hidden rounded-lg border border-mist bg-white p-4 sm:block">
          <p className="text-xs text-muted">출고 금액</p>
          <p className="mt-1 text-xl font-semibold text-crimsond">{formatWon(data?.totalOutAmt ?? 0)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-mist bg-white">
        <div className="border-b border-mist px-4 py-3.5 text-sm font-semibold text-inktext">
          재고 수불부 ({startDate} ~ {endDate})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed text-sm">
            <colgroup>
              <col className="w-[220px]" />
              <col className="w-[100px]" />
              <col className="w-[90px]" />
              <col className="w-[110px]" />
              <col className="w-[90px]" />
              <col className="w-[110px]" />
              <col className="w-[90px]" />
              <col className="w-[110px]" />
              <col className="w-[90px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-mist bg-mist/40 text-center text-xs text-muted">
                <th rowSpan={2} className="px-4 py-2.5 text-left font-medium">
                  품명
                </th>
                <th rowSpan={2} className="px-4 py-2.5 text-right font-medium">
                  단가
                </th>
                <th colSpan={2} className="border-l border-mist px-4 py-2.5 font-medium">
                  기초재고
                </th>
                <th colSpan={2} className="border-l border-mist px-4 py-2.5 font-medium">
                  입고
                </th>
                <th colSpan={2} className="border-l border-mist px-4 py-2.5 font-medium">
                  출고
                </th>
                <th colSpan={2} className="border-l border-mist px-4 py-2.5 font-medium">
                  기말재고
                </th>
              </tr>
              <tr className="border-b border-mist bg-mist/40 text-right text-xs text-muted">
                <th className="border-l border-mist px-4 py-2.5 font-medium">수량</th>
                <th className="px-4 py-2.5 font-medium">금액</th>
                <th className="border-l border-mist px-4 py-2.5 font-medium">수량</th>
                <th className="px-4 py-2.5 font-medium">금액</th>
                <th className="border-l border-mist px-4 py-2.5 font-medium">수량</th>
                <th className="px-4 py-2.5 font-medium">금액</th>
                <th className="border-l border-mist px-4 py-2.5 font-medium">수량</th>
                <th className="px-4 py-2.5 font-medium">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {(data?.rows ?? []).map((row) => (
                <tr key={row.itemCode}>
                  <td className="truncate px-4 py-3 font-medium">{row.itemName}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted">{formatWon(row.unitPrice)}</td>
                  <td className="border-l border-mist px-4 py-3 text-right font-mono">{formatQty(row.beginQty)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatWon(row.beginAmt)}</td>
                  <td className="border-l border-mist px-4 py-3 text-right font-mono text-brine">{formatQty(row.inQty)}</td>
                  <td className="px-4 py-3 text-right font-mono text-brine">{formatWon(row.inAmt)}</td>
                  <td className="border-l border-mist px-4 py-3 text-right font-mono text-crimsond">{formatQty(row.outQty)}</td>
                  <td className="px-4 py-3 text-right font-mono text-crimsond">{formatWon(row.outAmt)}</td>
                  <td className="border-l border-mist px-4 py-3 text-right font-mono font-semibold">{formatQty(row.endQty)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{formatWon(row.endAmt)}</td>
                </tr>
              ))}
              {!isPending && (data?.rows.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted">
                    재고 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-inktext">안전재고 관리</p>
          <p className="mt-1 text-sm text-muted">품목별 안전재고 기준 대비 현황이 이 자리에 추가될 예정입니다.</p>
        </div>
        <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-inktext">발주관리</p>
          <p className="mt-1 text-sm text-muted">부족 품목 발주 요청·현황 관리가 이 자리에 추가될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
}

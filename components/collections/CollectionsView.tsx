"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getCollectionsData, type CollectionsData } from "@/app/actions/collections";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function todayMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function monthRange(monthValue: string) {
  const [y, m] = monthValue.split("-").map(Number);
  const start = `${y}${pad(m)}01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}${pad(m)}${pad(lastDay)}`;
  return { start, end };
}
function formatWon(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export function CollectionsView() {
  const [monthValue, setMonthValue] = useState(todayMonthValue);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<CollectionsData | null>(null);
  const [isPending, startTransition] = useTransition();

  const { start, end } = useMemo(() => monthRange(monthValue), [monthValue]);

  useEffect(() => {
    startTransition(async () => {
      const result = await getCollectionsData({ startDate: start, endDate: end, search: search || undefined });
      setData(result);
    });
  }, [start, end, search]);

  return (
    <div className="max-w-6xl space-y-5 px-5 py-8 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">기준월</label>
          <input
            type="month"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
            className="rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          />
        </div>
        <div className="flex min-w-[200px] flex-1 items-center gap-2">
          <label className="text-sm text-muted">거래처 검색</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="거래처명"
            className="flex-1 rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">이 달 수금액</p>
          <p className="mt-1 text-xl font-semibold text-inktext">{formatWon(data?.totalReceipt ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">미수금 잔액</p>
          <p className="mt-1 text-xl font-semibold text-crimsond">{formatWon(data?.totalBalance ?? 0)}</p>
        </div>
        <div className="hidden rounded-lg border border-mist bg-white p-4 sm:block">
          <p className="text-xs text-muted">미수 거래처</p>
          <p className="mt-1 text-xl font-semibold text-inktext">{data?.outstandingCustomerCount ?? 0}곳</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-mist bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">거래처</th>
              <th className="px-4 py-3 font-medium">기준월</th>
              <th className="px-4 py-3 text-right font-medium">수금액</th>
              <th className="px-4 py-3 text-right font-medium">잔액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {(data?.rows ?? []).map((row) => (
              <tr key={row.customerCode}>
                <td className="px-4 py-3.5 font-medium">{row.customerName}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-muted">{monthValue}</td>
                <td className="px-4 py-3.5 text-right font-mono">{Math.round(row.periodReceipt).toLocaleString("ko-KR")}</td>
                <td className="px-4 py-3.5 text-right font-mono">
                  <span className={row.balance > 0 ? "text-crimsond" : "text-brine"}>
                    {Math.round(row.balance).toLocaleString("ko-KR")}
                  </span>
                </td>
              </tr>
            ))}
            {!isPending && (data?.rows.length ?? 0) === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                  해당 월 수금 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

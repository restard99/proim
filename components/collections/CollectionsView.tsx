"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { getCollectionsData, getCustomerLedgerData, type CollectionsData } from "@/app/actions/collections";
import type { CustomerLedger } from "@/lib/yerp/collections";

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
function formatAmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}
function formatSlipDate(ymd: string) {
  if (ymd.length !== 8) return ymd;
  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

export function CollectionsView() {
  const [monthValue, setMonthValue] = useState(todayMonthValue);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<CollectionsData | null>(null);
  const [isPending, startTransition] = useTransition();

  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [ledgerCache, setLedgerCache] = useState<Record<string, CustomerLedger>>({});
  const [isLoadingLedger, startLedgerTransition] = useTransition();

  const { start, end } = useMemo(() => monthRange(monthValue), [monthValue]);

  useEffect(() => {
    startTransition(async () => {
      setExpandedCode(null);
      setLedgerCache({});
      const result = await getCollectionsData({ startDate: start, endDate: end, search: search || undefined });
      setData(result);
    });
  }, [start, end, search]);

  function toggleExpand(customerCode: string) {
    if (expandedCode === customerCode) {
      setExpandedCode(null);
      return;
    }
    setExpandedCode(customerCode);
    if (!ledgerCache[customerCode]) {
      startLedgerTransition(async () => {
        const ledger = await getCustomerLedgerData({ customerCode, startDate: start, endDate: end });
        setLedgerCache((prev) => ({ ...prev, [customerCode]: ledger }));
      });
    }
  }

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
              <th className="px-4 py-3 text-right font-medium">기초잔액</th>
              <th className="px-4 py-3 text-right font-medium">매출발생</th>
              <th className="px-4 py-3 text-right font-medium">수금액</th>
              <th className="px-4 py-3 text-right font-medium">기말잔액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {(data?.rows ?? []).map((row) => (
              <Fragment key={row.customerCode}>
                <tr
                  onClick={() => toggleExpand(row.customerCode)}
                  className={`cursor-pointer transition-colors hover:bg-mist/30 ${
                    expandedCode === row.customerCode ? "bg-crimson/5" : ""
                  }`}
                >
                  <td className="px-4 py-3.5 font-medium">{row.customerName}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-muted">
                    {formatAmt(row.beginBalance)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-brine">{formatAmt(row.periodDebit)}</td>
                  <td className="px-4 py-3.5 text-right font-mono">{formatAmt(row.periodReceipt)}</td>
                  <td className="px-4 py-3.5 text-right font-mono">
                    <span className={row.balance > 0 ? "text-crimsond" : "text-brine"}>
                      {formatAmt(row.balance)}
                    </span>
                  </td>
                </tr>
                {expandedCode === row.customerCode && (
                  <tr key={`${row.customerCode}-detail`}>
                    <td colSpan={5} className="bg-salt px-4 py-4">
                      {isLoadingLedger && !ledgerCache[row.customerCode] && (
                        <p className="py-4 text-center text-xs text-muted">거래 내역을 불러오는 중…</p>
                      )}
                      {ledgerCache[row.customerCode] && (
                        <div className="overflow-x-auto rounded-md border border-mist bg-white">
                          <table className="w-full min-w-[600px] text-xs">
                            <thead>
                              <tr className="border-b border-mist bg-mist/40 text-left text-muted">
                                <th className="px-3 py-2 font-medium">일자</th>
                                <th className="px-3 py-2 font-medium">구분</th>
                                <th className="px-3 py-2 font-medium">적요/상대계정</th>
                                <th className="px-3 py-2 text-right font-medium">금액</th>
                                <th className="px-3 py-2 text-right font-medium">잔액</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-mist">
                              <tr className="bg-mist/20 font-medium text-inktext">
                                <td className="px-3 py-2" colSpan={4}>
                                  기초잔액
                                </td>
                                <td className="px-3 py-2 text-right font-mono">
                                  {formatAmt(ledgerCache[row.customerCode].beginBalance)}
                                </td>
                              </tr>
                              {ledgerCache[row.customerCode].entries.map((entry, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 font-mono text-muted">{formatSlipDate(entry.slipDate)}</td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={
                                        entry.debCrd === "3"
                                          ? "rounded-full bg-brine/10 px-2 py-0.5 text-brine"
                                          : "rounded-full bg-crimson/10 px-2 py-0.5 text-crimsond"
                                      }
                                    >
                                      {entry.debCrd === "3" ? "매출발생" : "수금"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-muted">
                                    {entry.note || entry.counterAccount || "-"}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">{formatAmt(entry.amount)}</td>
                                  <td className="px-3 py-2 text-right font-mono">
                                    {formatAmt(entry.runningBalance)}
                                  </td>
                                </tr>
                              ))}
                              {ledgerCache[row.customerCode].entries.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-3 py-4 text-center text-muted">
                                    해당 기간 거래 내역이 없습니다.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!isPending && (data?.rows.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
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

"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { getDisbursementsData, getVendorLedgerData, type DisbursementsData } from "@/app/actions/disbursements";
import { DISBURSEMENT_CORPS, type DisbursementCorpCode, type VendorLedger } from "@/lib/yerp/disbursements";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toYmd(dateInputValue: string) {
  return dateInputValue.replaceAll("-", "");
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

export function DisbursementsView() {
  const today = useMemo(() => new Date(), []);
  const [corpCode, setCorpCode] = useState<DisbursementCorpCode>(DISBURSEMENT_CORPS[0].corpCode);
  const [startDate, setStartDate] = useState(() => toDateInputValue(new Date(today.getFullYear(), 0, 1)));
  const [endDate, setEndDate] = useState(() => toDateInputValue(today));
  const [search, setSearch] = useState("");
  const [data, setData] = useState<DisbursementsData | null>(null);
  const [isPending, startTransition] = useTransition();

  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [ledgerCache, setLedgerCache] = useState<Record<string, VendorLedger>>({});
  const [isLoadingLedger, startLedgerTransition] = useTransition();

  const start = toYmd(startDate);
  const end = toYmd(endDate);

  useEffect(() => {
    startTransition(async () => {
      setExpandedCode(null);
      setLedgerCache({});
      const result = await getDisbursementsData({ corpCode, startDate: start, endDate: end, search: search || undefined });
      setData(result);
    });
  }, [corpCode, start, end, search]);

  function toggleExpand(vendorCode: string) {
    if (expandedCode === vendorCode) {
      setExpandedCode(null);
      return;
    }
    setExpandedCode(vendorCode);
    if (!ledgerCache[vendorCode]) {
      startLedgerTransition(async () => {
        const ledger = await getVendorLedgerData({ corpCode, vendorCode, startDate: start, endDate: end });
        setLedgerCache((prev) => ({ ...prev, [vendorCode]: ledger }));
      });
    }
  }

  return (
    <div className="max-w-6xl space-y-5 px-5 py-8 lg:px-8">
      <div className="flex flex-wrap items-center gap-2">
        {DISBURSEMENT_CORPS.map((corp) => (
          <button
            key={corp.corpCode}
            type="button"
            onClick={() => setCorpCode(corp.corpCode)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              corpCode === corp.corpCode ? "bg-ink text-salt" : "bg-mist text-inktext hover:bg-mist/70"
            }`}
          >
            {corp.corpName}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
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
        <div className="flex min-w-[200px] flex-1 items-center gap-2">
          <label className="text-sm text-muted">매입처 검색</label>
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
          <p className="text-xs text-muted">기간 지급액</p>
          <p className="mt-1 text-xl font-semibold text-inktext">{formatWon(data?.totalPayment ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">미지급 잔액</p>
          <p className="mt-1 text-xl font-semibold text-crimsond">{formatWon(data?.totalBalance ?? 0)}</p>
        </div>
        <div className="hidden rounded-lg border border-mist bg-white p-4 sm:block">
          <p className="text-xs text-muted">미지급 매입처</p>
          <p className="mt-1 text-xl font-semibold text-inktext">{data?.outstandingVendorCount ?? 0}곳</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-mist bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">매입처</th>
              <th className="px-4 py-3 text-right font-medium">기초잔액</th>
              <th className="px-4 py-3 text-right font-medium">매입발생</th>
              <th className="px-4 py-3 text-right font-medium">지급액</th>
              <th className="px-4 py-3 text-right font-medium">기말잔액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {(data?.rows ?? []).map((row) => (
              <Fragment key={row.vendorCode}>
                <tr
                  onClick={() => toggleExpand(row.vendorCode)}
                  className={`cursor-pointer transition-colors hover:bg-mist/30 ${
                    expandedCode === row.vendorCode ? "bg-crimson/5" : ""
                  }`}
                >
                  <td className="px-4 py-3.5 font-medium">{row.vendorName}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-muted">
                    {formatAmt(row.beginBalance)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-brine">{formatAmt(row.periodPurchase)}</td>
                  <td className="px-4 py-3.5 text-right font-mono">{formatAmt(row.periodPayment)}</td>
                  <td className="px-4 py-3.5 text-right font-mono">
                    <span className={row.balance > 0 ? "text-crimsond" : "text-brine"}>
                      {formatAmt(row.balance)}
                    </span>
                  </td>
                </tr>
                {expandedCode === row.vendorCode && (
                  <tr key={`${row.vendorCode}-detail`}>
                    <td colSpan={5} className="bg-salt px-4 py-4">
                      {isLoadingLedger && !ledgerCache[row.vendorCode] && (
                        <p className="py-4 text-center text-xs text-muted">거래 내역을 불러오는 중…</p>
                      )}
                      {ledgerCache[row.vendorCode] && (
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
                                  {formatAmt(ledgerCache[row.vendorCode].beginBalance)}
                                </td>
                              </tr>
                              {ledgerCache[row.vendorCode].entries.map((entry, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 font-mono text-muted">{formatSlipDate(entry.slipDate)}</td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={
                                        entry.debCrd === "4"
                                          ? "rounded-full bg-brine/10 px-2 py-0.5 text-brine"
                                          : "rounded-full bg-crimson/10 px-2 py-0.5 text-crimsond"
                                      }
                                    >
                                      {entry.debCrd === "4" ? "매입발생" : "지급"}
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
                              {ledgerCache[row.vendorCode].entries.length === 0 && (
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
                  해당 기간 출금 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        ※ 외상매입금(0251)·미지급금(0253) 계정 일반전표 기준입니다. 품목/자재 단위 세부 내역은 원장에 기록되지
        않아 조회할 수 없습니다.
      </p>
    </div>
  );
}

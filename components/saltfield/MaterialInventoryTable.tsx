"use client";

import { useMemo, useState } from "react";
import { MaterialUploadButton } from "./MaterialUploadButton";
import type { MaterialRow } from "@/app/actions/saltfield-materials";

function formatNum(n: number | null | undefined) {
  return n === null || n === undefined ? "-" : n.toLocaleString("ko-KR");
}

export function MaterialInventoryTable({
  rows,
  months,
  defaultMonth,
}: {
  rows: MaterialRow[];
  months: string[];
  defaultMonth: string;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (r.month_label !== month) return false;
      const q = query.trim();
      if (!q) return true;
      return r.vendor_name.includes(q) || r.item_name.includes(q);
    });
  }, [rows, month, query]);

  if (rows.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-end">
          <MaterialUploadButton />
        </div>
        <div className="mt-5 rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-inktext">업로드된 부자재재고 데이터가 없습니다</p>
          <p className="mt-1 text-sm text-muted">부자재 입출고내역 엑셀을 업로드하면 여기에 표시됩니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-mist bg-white px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="업체명 또는 품명 검색"
            className="rounded-md border border-mist bg-white px-3.5 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30 w-56"
          />
        </div>
        <MaterialUploadButton />
      </div>

      <div className="mt-5 rounded-md bg-sand/20 border border-sand/50 px-4 py-2.5 text-xs text-inktext">
        새 파일을 업로드하면 이 목록 전체가 업로드한 파일 내용으로 교체됩니다.
      </div>

      <div className="mt-4 rounded-lg border border-mist bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium text-left">업체명</th>
              <th className="px-4 py-3 font-medium text-left">품명</th>
              <th className="px-4 py-3 font-medium text-left">단가</th>
              <th className="px-4 py-3 font-medium text-left">이월재고</th>
              <th className="px-4 py-3 font-medium text-left">입고</th>
              <th className="px-4 py-3 font-medium text-left">출고</th>
              <th className="px-4 py-3 font-medium text-left">재고</th>
              <th className="px-4 py-3 font-medium text-left">재고금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {filtered.map((r, i) => (
              <tr key={`${r.vendor_name}-${r.item_name}-${i}`} className="hover:bg-mist/20">
                <td className="px-4 py-3.5">{r.vendor_name}</td>
                <td className="px-4 py-3.5">{r.item_name}</td>
                <td className="px-4 py-3.5 text-left font-mono">{formatNum(r.unit_price)}</td>
                <td className="px-4 py-3.5 text-left font-mono">{formatNum(r.carryover_qty)}</td>
                <td className="px-4 py-3.5 text-left font-mono">{formatNum(r.inbound_qty)}</td>
                <td className="px-4 py-3.5 text-left font-mono">{formatNum(r.outbound_qty)}</td>
                <td className="px-4 py-3.5 text-left font-mono font-semibold">{formatNum(r.stock_qty)}</td>
                <td className="px-4 py-3.5 text-left font-mono">{formatNum(r.stock_value)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

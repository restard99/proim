"use client";

import { useEffect, useState, useTransition } from "react";
import { getInventoryData, type InventoryData } from "@/app/actions/inventory";
import type { InventoryCategory } from "@/lib/yerp/inventory";

const CATEGORIES: InventoryCategory[] = ["부자재", "완제품", "3자물류"];

function formatWon(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}
function formatQty(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}
function formatDate(ymd: string) {
  if (!ymd || ymd.length !== 8) return ymd;
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

export function InventoryView() {
  const [category, setCategory] = useState<InventoryCategory>("부자재");
  const [data, setData] = useState<InventoryData | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getInventoryData(category);
      setData(result);
    });
  }, [category]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-5 py-8 lg:px-8">
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">재고 수량</p>
          <p className="mt-1 text-xl font-semibold text-inktext">{formatQty(data?.totalQuantity ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">재고 금액</p>
          <p className="mt-1 text-xl font-semibold text-inktext">{formatWon(data?.totalAmount ?? 0)}</p>
        </div>
        <div className="hidden rounded-lg border border-mist bg-white p-4 sm:block">
          <p className="text-xs text-muted">품목 수</p>
          <p className="mt-1 text-xl font-semibold text-inktext">{data?.rows.length ?? 0}개</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-mist bg-white">
        <div className="border-b border-mist px-4 py-3.5 text-sm font-semibold text-inktext">현재 재고</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">품목</th>
              <th className="px-4 py-3 text-right font-medium">수량</th>
              <th className="px-4 py-3 text-right font-medium">금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {(data?.rows ?? []).map((row) => (
              <tr key={row.itemCode}>
                <td className="px-4 py-3.5 font-medium">{row.itemName}</td>
                <td className="px-4 py-3.5 text-right font-mono">{formatQty(row.quantity)}</td>
                <td className="px-4 py-3.5 text-right font-mono">{formatWon(row.amount)}</td>
              </tr>
            ))}
            {!isPending && (data?.rows.length ?? 0) === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted">
                  재고 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg border border-mist bg-white">
        <div className="border-b border-mist px-4 py-3.5 text-sm font-semibold text-inktext">최근 입출고 내역</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">일자</th>
              <th className="px-4 py-3 font-medium">품목</th>
              <th className="px-4 py-3 font-medium">창고</th>
              <th className="px-4 py-3 font-medium">구분</th>
              <th className="px-4 py-3 text-right font-medium">수량</th>
              <th className="px-4 py-3 text-right font-medium">금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {(data?.movements ?? []).map((m, i) => (
              <tr key={i}>
                <td className="px-4 py-3.5 font-mono text-xs text-muted">{formatDate(m.date)}</td>
                <td className="px-4 py-3.5 font-medium">{m.itemName}</td>
                <td className="px-4 py-3.5 text-muted">{m.storageName}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.direction === "in" ? "bg-brine/10 text-brine" : "bg-crimson/10 text-crimsond"
                    }`}
                  >
                    {m.ioSecName}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right font-mono">{formatQty(m.quantity)}</td>
                <td className="px-4 py-3.5 text-right font-mono">{formatWon(m.amount)}</td>
              </tr>
            ))}
            {!isPending && (data?.movements.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  입출고 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

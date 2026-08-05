"use client";

import { useMemo, useState } from "react";
import type { DailyReportRow } from "@/app/actions/worklog";

export function RecentReportList({
  reports,
  selectedId,
  onSelect,
  onNew,
}: {
  reports: DailyReportRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.report_date.includes(q) ||
        (r.visited_customers ?? "").includes(q) ||
        (r.content ?? "").includes(q),
    );
  }, [reports, query]);

  return (
    <div className="h-fit overflow-hidden rounded-lg border border-mist bg-white">
      <div className="border-b border-mist px-4 py-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-inktext">최근 제출 내역</h2>
          <button type="button" onClick={onNew} className="text-xs font-medium text-crimson hover:underline">
            + 새 항목 작성
          </button>
        </div>
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.42 9.82l3.63 3.63a1 1 0 0 0 1.42-1.42l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5.5 9a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="날짜, 거래처, 내용 검색"
            className="w-full rounded-md border border-mist py-2 pl-8 pr-3 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          />
        </div>
      </div>
      <ul className="divide-y divide-mist">
        {filtered.map((r) => (
          <li
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`cursor-pointer px-4 py-3 transition-colors hover:bg-mist/40 ${
              r.id === selectedId ? "border-l-2 border-crimson bg-crimson/5" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-inktext">{r.report_date}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.status === "submitted" ? "bg-brine/10 text-brine" : "bg-mist text-muted"
                }`}
              >
                {r.status === "submitted" ? "제출완료" : "임시저장"}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted">{r.visited_customers || r.content || "-"}</p>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-muted">
            {reports.length === 0 ? "작성한 업무일지가 없습니다." : "검색 결과가 없습니다."}
          </li>
        )}
      </ul>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { DailyReportRow } from "@/app/actions/worklog";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function RecentReportList({
  reports,
  selectedDate,
  onSelect,
}: {
  reports: DailyReportRow[];
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const [query, setQuery] = useState("");
  const today = todayISO();

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

  const hasToday = reports.some((r) => r.report_date === today);

  return (
    <div className="h-fit overflow-hidden rounded-lg border border-mist bg-white">
      <div className="border-b border-mist px-4 py-3.5">
        <h2 className="mb-2.5 text-sm font-semibold text-inktext">최근 제출 내역</h2>
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
        {!hasToday && !query && (
          <li
            onClick={() => onSelect(today)}
            className={`cursor-pointer px-4 py-3 ${
              selectedDate === today ? "border-l-2 border-crimson bg-crimson/5" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-inktext">{today} (오늘)</span>
              <span className="rounded-full bg-mist px-2 py-0.5 text-xs font-medium text-muted">작성 전</span>
            </div>
          </li>
        )}
        {filtered.map((r) => (
          <li
            key={r.report_date}
            onClick={() => onSelect(r.report_date)}
            className={`cursor-pointer px-4 py-3 transition-colors hover:bg-mist/40 ${
              r.report_date === selectedDate ? "border-l-2 border-crimson bg-crimson/5" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-inktext">
                {r.report_date}
                {r.report_date === today ? " (오늘)" : ""}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.status === "submitted" ? "bg-brine/10 text-brine" : "bg-mist text-muted"
                }`}
              >
                {r.status === "submitted" ? "제출완료" : "임시저장"}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted">{r.visited_customers || r.content || "-"}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(r.report_date);
              }}
              className="mt-2 text-xs font-medium text-crimson hover:underline"
            >
              수정
            </button>
          </li>
        ))}
        {filtered.length === 0 && reports.length > 0 && (
          <li className="px-4 py-6 text-center text-xs text-muted">검색 결과가 없습니다.</li>
        )}
      </ul>
    </div>
  );
}

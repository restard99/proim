"use client";

import { useMemo, useState } from "react";
import { DailyReportForm } from "./DailyReportForm";
import { RecentReportList } from "./RecentReportList";
import type { DailyReportRow } from "@/app/actions/worklog";

export function MemberWorklogView({
  initialReports,
  submitLabel,
}: {
  initialReports: DailyReportRow[];
  submitLabel?: string;
}) {
  const [reports, setReports] = useState(initialReports);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId],
  );

  function handleSaved(updated: DailyReportRow) {
    setReports((prev) => {
      const exists = prev.some((r) => r.id === updated.id);
      const next = exists ? prev.map((r) => (r.id === updated.id ? updated : r)) : [updated, ...prev];
      return next.sort((a, b) => (a.report_date < b.report_date ? 1 : a.report_date > b.report_date ? -1 : 0));
    });
    // 기존 항목을 편집하던 중이었다면 selectedId가 이미 그 id이므로 그대로 유지.
    // 새 항목을 저장한 경우에는 selectedId를 바꾸지 않는다 — 바꾸면 폼이 "그 항목 수정 모드"로
    // 전환되어, 이어서 또 새 항목을 쓰려는 사용자가 모르고 방금 저장한 항목을 덮어쓰게 된다.
  }

  function handleDeleted(id: string) {
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="grid max-w-7xl grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[380px_1fr] lg:px-8">
      <RecentReportList
        reports={reports}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNew={() => setSelectedId(null)}
        onDeleted={handleDeleted}
      />
      <DailyReportForm
        key={selectedId ?? "new"}
        report={selectedReport}
        onSaved={handleSaved}
        onDelete={handleDeleted}
        submitLabel={submitLabel}
      />
    </div>
  );
}

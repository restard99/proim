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
    setSelectedId(updated.id);
  }

  return (
    <div className="grid max-w-7xl grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[380px_1fr] lg:px-8">
      <RecentReportList
        reports={reports}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNew={() => setSelectedId(null)}
      />
      <DailyReportForm
        key={selectedId ?? "new"}
        report={selectedReport}
        onSaved={handleSaved}
        submitLabel={submitLabel}
      />
    </div>
  );
}

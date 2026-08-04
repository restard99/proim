"use client";

import { useMemo, useState } from "react";
import { DailyReportForm } from "./DailyReportForm";
import { RecentReportList } from "./RecentReportList";
import type { DailyReportRow } from "@/app/actions/worklog";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function MemberWorklogView({
  initialReports,
  submitLabel,
}: {
  initialReports: DailyReportRow[];
  submitLabel?: string;
}) {
  const [reports, setReports] = useState(initialReports);
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const selectedReport = useMemo(
    () => reports.find((r) => r.report_date === selectedDate) ?? null,
    [reports, selectedDate],
  );

  function handleSaved(updated: DailyReportRow) {
    setReports((prev) => {
      const others = prev.filter((r) => r.report_date !== updated.report_date);
      return [updated, ...others].sort((a, b) => (a.report_date < b.report_date ? 1 : -1));
    });
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[380px_1fr] lg:px-8">
      <RecentReportList reports={reports} selectedDate={selectedDate} onSelect={setSelectedDate} />
      <DailyReportForm
        key={selectedDate}
        reportDate={selectedDate}
        initialReport={selectedReport}
        onSaved={handleSaved}
        submitLabel={submitLabel}
      />
    </div>
  );
}

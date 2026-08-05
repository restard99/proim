"use client";

import { useState, useTransition } from "react";
import { saveDailyReport, type DailyReportRow } from "@/app/actions/worklog";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function DailyReportForm({
  report,
  onSaved,
  submitLabel = "제출하기",
}: {
  report: DailyReportRow | null;
  onSaved: (row: DailyReportRow) => void;
  submitLabel?: string;
}) {
  const [reportDate, setReportDate] = useState(report?.report_date ?? todayISO());
  const [visitedCustomers, setVisitedCustomers] = useState(report?.visited_customers ?? "");
  const [content, setContent] = useState(report?.content ?? "");
  const [notes, setNotes] = useState(report?.notes ?? "");
  const [status, setStatus] = useState<"draft" | "submitted">(report?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(nextStatus: "draft" | "submitted") {
    setError(null);
    startTransition(async () => {
      const result = await saveDailyReport({
        id: report?.id,
        reportDate,
        visitedCustomers,
        content,
        notes,
        status: nextStatus,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStatus(nextStatus);
      onSaved({
        id: result.id,
        report_date: reportDate,
        visited_customers: visitedCustomers,
        content,
        notes,
        status: nextStatus,
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-inktext">{report ? "업무일지 수정" : "새 업무일지 작성"}</h2>
          <p className="mt-0.5 text-sm text-muted">날짜를 선택하고 업무 내용을 자유롭게 작성하세요.</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            status === "submitted" ? "bg-brine/10 text-brine" : "bg-mist text-muted"
          }`}
        >
          {status === "submitted" ? "제출완료" : "임시저장"}
        </span>
      </div>

      <div className="space-y-4 rounded-lg border border-mist bg-white p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-inktext">날짜</label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="rounded-md border border-mist px-3.5 py-2.5 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-inktext">방문한 거래처</label>
          <input
            type="text"
            value={visitedCustomers}
            onChange={(e) => setVisitedCustomers(e.target.value)}
            className="w-full rounded-md border border-mist px-3.5 py-2.5 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-inktext">주요 업무 내용</label>
          <textarea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-md border border-mist px-3.5 py-2.5 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-inktext">특이사항</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="공유할 특이사항이 있다면 적어주세요"
            className="w-full rounded-md border border-mist px-3.5 py-2.5 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          />
        </div>
      </div>

      {error && <p className="text-sm text-crimsond">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSave("draft")}
          className="rounded-md border border-mist px-4 py-2.5 text-sm font-medium text-inktext transition-colors hover:bg-mist/50 disabled:opacity-50"
        >
          임시저장
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSave("submitted")}
          className="rounded-md bg-crimson px-4 py-2.5 text-sm font-medium text-salt transition-colors hover:bg-crimsond disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

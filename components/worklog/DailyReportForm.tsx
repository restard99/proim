"use client";

import { useState, useTransition } from "react";
import { saveDailyReport, type DailyReportRow } from "@/app/actions/worklog";

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export function DailyReportForm({
  reportDate,
  initialReport,
  onSaved,
}: {
  reportDate: string;
  initialReport: DailyReportRow | null;
  onSaved: (row: DailyReportRow) => void;
}) {
  const [visitedCustomers, setVisitedCustomers] = useState(initialReport?.visited_customers ?? "");
  const [content, setContent] = useState(initialReport?.content ?? "");
  const [notes, setNotes] = useState(initialReport?.notes ?? "");
  const [status, setStatus] = useState<"draft" | "submitted">(initialReport?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(nextStatus: "draft" | "submitted") {
    setError(null);
    startTransition(async () => {
      const result = await saveDailyReport({
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
        id: initialReport?.id ?? reportDate,
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
          <h2 className="text-base font-semibold text-inktext">{formatDateLabel(reportDate)}</h2>
          <p className="mt-0.5 text-sm text-muted">오늘 업무 내용을 작성해 팀장에게 제출하세요.</p>
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
          <label className="mb-1.5 block text-sm font-medium text-inktext">오늘 방문한 거래처</label>
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
          제출하기
        </button>
      </div>
    </div>
  );
}

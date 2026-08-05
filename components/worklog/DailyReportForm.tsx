"use client";

import { useRef, useState, useTransition } from "react";
import { saveDailyReport, type DailyReportRow } from "@/app/actions/worklog";
import { uploadWorklogAttachment, getAttachmentUrl } from "@/app/actions/attachments";

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

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(report?.attachment_path ?? null);
  const [attachmentName, setAttachmentName] = useState<string | null>(report?.attachment_name ?? null);
  const [isOpeningAttachment, setIsOpeningAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAttachmentFile(e.target.files?.[0] ?? null);
  }

  function handleRemoveAttachment() {
    setAttachmentFile(null);
    setAttachmentPath(null);
    setAttachmentName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleOpenAttachment() {
    if (!attachmentPath) return;
    setIsOpeningAttachment(true);
    const url = await getAttachmentUrl(attachmentPath);
    setIsOpeningAttachment(false);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleSave(nextStatus: "draft" | "submitted") {
    setError(null);
    startTransition(async () => {
      let finalPath = attachmentPath;
      let finalName = attachmentName;

      if (attachmentFile) {
        const formData = new FormData();
        formData.append("file", attachmentFile);
        const uploadResult = await uploadWorklogAttachment(formData);
        if (!uploadResult.ok) {
          setError(uploadResult.message);
          return;
        }
        finalPath = uploadResult.path;
        finalName = uploadResult.name;
      }

      const result = await saveDailyReport({
        id: report?.id,
        reportDate,
        visitedCustomers,
        content,
        notes,
        status: nextStatus,
        attachmentPath: finalPath,
        attachmentName: finalName,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStatus(nextStatus);
      setAttachmentFile(null);
      setAttachmentPath(finalPath);
      setAttachmentName(finalName);
      onSaved({
        id: result.id,
        report_date: reportDate,
        visited_customers: visitedCustomers,
        content,
        notes,
        status: nextStatus,
        attachment_path: finalPath,
        attachment_name: finalName,
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
          <label className="mb-1.5 block text-sm font-medium text-inktext">제목</label>
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
        <div>
          <label className="mb-1.5 block text-sm font-medium text-inktext">첨부 (선택)</label>
          {attachmentName && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-mist bg-salt px-3 py-2 text-sm">
              <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M8 4a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V8a1 1 0 1 1 2 0v5a5 5 0 1 1-10 0V7a5 5 0 0 1 10 0v5a1 1 0 1 1-2 0V7a3 3 0 0 0-3-3Z"
                />
              </svg>
              <button
                type="button"
                onClick={handleOpenAttachment}
                disabled={isOpeningAttachment || !attachmentPath}
                className="min-w-0 flex-1 truncate text-left text-crimson hover:underline disabled:no-underline disabled:text-muted"
              >
                {attachmentFile ? attachmentName + " (저장 시 업로드됩니다)" : attachmentName}
              </button>
              <button
                type="button"
                onClick={handleRemoveAttachment}
                className="shrink-0 text-xs font-medium text-muted hover:text-crimsond"
              >
                삭제
              </button>
            </div>
          )}
          {!attachmentName && (
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="w-full rounded-md border border-mist px-3.5 py-2.5 text-sm text-muted outline-none file:mr-3 file:rounded-md file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-inktext"
            />
          )}
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

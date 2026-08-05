"use client";

import { useRef, useState, useTransition } from "react";
import { saveDailyReport, deleteDailyReport, type DailyReportRow, type DailyReportAttachment } from "@/app/actions/worklog";
import { addReportAttachment, removeReportAttachment, getAttachmentUrl } from "@/app/actions/attachments";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function AttachmentIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 4a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V8a1 1 0 1 1 2 0v5a5 5 0 1 1-10 0V7a5 5 0 0 1 10 0v5a1 1 0 1 1-2 0V7a3 3 0 0 0-3-3Z"
      />
    </svg>
  );
}

export function DailyReportForm({
  report,
  onSaved,
  onDelete,
  submitLabel = "저장하기",
}: {
  report: DailyReportRow | null;
  onSaved: (row: DailyReportRow) => void;
  onDelete?: (id: string) => void;
  submitLabel?: string;
}) {
  const [reportId, setReportId] = useState<string | null>(report?.id ?? null);
  const [reportDate, setReportDate] = useState(report?.report_date ?? todayISO());
  const [visitedCustomers, setVisitedCustomers] = useState(report?.visited_customers ?? "");
  const [content, setContent] = useState(report?.content ?? "");
  const [notes, setNotes] = useState(report?.notes ?? "");
  const [status, setStatus] = useState<"draft" | "submitted">(report?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [attachments, setAttachments] = useState<DailyReportAttachment[]>(report?.attachments ?? []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!reportId) {
      setPendingFiles((prev) => [...prev, file]);
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    addReportAttachment(reportId, formData).then((result) => {
      setIsUploading(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setAttachments((prev) => [...prev, result.attachment]);
    });
  }

  function handleRemovePending(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleRemoveAttachment(attachment: DailyReportAttachment) {
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    removeReportAttachment(attachment.id, attachment.path);
  }

  async function handleOpenAttachment(attachment: DailyReportAttachment) {
    setOpeningId(attachment.id);
    const url = await getAttachmentUrl(attachment.path);
    setOpeningId(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveDailyReport({
        id: reportId ?? undefined,
        reportDate,
        visitedCustomers,
        content,
        notes,
        status: "submitted",
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      let finalAttachments = attachments;
      if (!reportId && pendingFiles.length > 0) {
        const uploaded: DailyReportAttachment[] = [];
        const failedNames: string[] = [];
        for (const file of pendingFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const uploadResult = await addReportAttachment(result.id, formData);
          if (uploadResult.ok) {
            uploaded.push(uploadResult.attachment);
          } else {
            failedNames.push(file.name);
          }
        }
        finalAttachments = [...attachments, ...uploaded];
        if (failedNames.length > 0) {
          setError(`업무일지는 저장됐지만 다음 첨부파일 업로드에 실패했습니다: ${failedNames.join(", ")}`);
        }
      }

      onSaved({
        id: result.id,
        report_date: reportDate,
        visited_customers: visitedCustomers,
        content,
        notes,
        status: "submitted",
        attachments: finalAttachments,
      });

      if (report === null) {
        // 새 항목을 저장한 경우: 이 항목을 계속 수정하는 모드로 남지 않고,
        // 다음 항목을 바로 이어서 쓸 수 있도록 폼을 비운다.
        setReportId(null);
        setReportDate(todayISO());
        setVisitedCustomers("");
        setContent("");
        setNotes("");
        setStatus("draft");
        setAttachments([]);
        setPendingFiles([]);
        return;
      }

      setReportId(result.id);
      setStatus("submitted");
      setAttachments(finalAttachments);
      setPendingFiles([]);
    });
  }

  function handleDeleteOrClear() {
    if (!reportId) {
      setReportDate(todayISO());
      setVisitedCustomers("");
      setContent("");
      setNotes("");
      setAttachments([]);
      setPendingFiles([]);
      setError(null);
      return;
    }
    if (!window.confirm("이 업무일지를 삭제할까요? 첨부파일도 함께 삭제됩니다.")) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteDailyReport(reportId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onDelete?.(reportId);
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
          {status === "submitted" ? "제출완료" : "미저장"}
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
          <label className="mb-1.5 block text-sm font-medium text-inktext">첨부 (선택, 여러 개 가능)</label>
          {(attachments.length > 0 || pendingFiles.length > 0) && (
            <ul className="mb-2 space-y-1.5">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-md border border-mist bg-salt px-3 py-2 text-sm">
                  <AttachmentIcon />
                  <button
                    type="button"
                    onClick={() => handleOpenAttachment(a)}
                    disabled={openingId === a.id}
                    className="min-w-0 flex-1 truncate text-left text-crimson hover:underline disabled:text-muted disabled:no-underline"
                  >
                    {a.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(a)}
                    className="shrink-0 text-xs font-medium text-muted hover:text-crimsond"
                  >
                    삭제
                  </button>
                </li>
              ))}
              {pendingFiles.map((f, i) => (
                <li
                  key={`pending-${i}`}
                  className="flex items-center gap-2 rounded-md border border-dashed border-mist bg-salt px-3 py-2 text-sm"
                >
                  <AttachmentIcon />
                  <span className="min-w-0 flex-1 truncate text-muted">{f.name} (저장 시 업로드됩니다)</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePending(i)}
                    className="shrink-0 text-xs font-medium text-muted hover:text-crimsond"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx"
            onChange={handleFileChange}
            disabled={isUploading}
            className="w-full rounded-md border border-mist px-3.5 py-2.5 text-sm text-muted outline-none file:mr-3 file:rounded-md file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-inktext disabled:opacity-50"
          />
          {isUploading && <p className="mt-1 text-xs text-muted">업로드 중…</p>}
        </div>
      </div>

      {error && <p className="text-sm text-crimsond">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={handleDeleteOrClear}
          className="rounded-md border border-mist px-4 py-2.5 text-sm font-medium text-crimsond transition-colors hover:bg-crimson/5 disabled:opacity-50"
        >
          삭제
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="rounded-md bg-crimson px-4 py-2.5 text-sm font-medium text-salt transition-colors hover:bg-crimsond disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

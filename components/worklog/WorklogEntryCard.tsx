"use client";

import { useState } from "react";
import type { RecentEntry, RecentEntryAttachment } from "@/app/actions/team-worklog";
import { getAttachmentUrl } from "@/app/actions/attachments";
import { RichTextViewer } from "./RichTextViewer";

function AttachmentIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-muted" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 4a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V8a1 1 0 1 1 2 0v5a5 5 0 1 1-10 0V7a5 5 0 0 1 10 0v5a1 1 0 1 1-2 0V7a3 3 0 0 0-3-3Z"
      />
    </svg>
  );
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function WorklogEntryCard({
  entry,
  onAddBlock,
}: {
  entry: RecentEntry;
  onAddBlock: (html: string, attachments: RecentEntryAttachment[]) => void;
}) {
  if (entry.contentFormat === "html") {
    return <HtmlEntryCard entry={entry} onAddBlock={onAddBlock} />;
  }
  return <TextEntryCard entry={entry} onAddBlock={onAddBlock} />;
}

function AttachmentList({
  attachments,
  checkedAttachments,
  onToggle,
}: {
  attachments: RecentEntryAttachment[];
  checkedAttachments?: boolean[];
  onToggle?: (i: number) => void;
}) {
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function handleOpen(path: string, id: string) {
    setOpeningId(id);
    const url = await getAttachmentUrl(path);
    setOpeningId(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  if (attachments.length === 0) return null;
  return (
    <ul className="mb-2 space-y-1">
      {attachments.map((a, i) => (
        <li key={a.id} className="flex items-center gap-2 text-xs">
          {checkedAttachments && onToggle && (
            <input
              type="checkbox"
              className="accent-crimson"
              checked={checkedAttachments[i]}
              onChange={() => onToggle(i)}
            />
          )}
          <AttachmentIcon />
          <button
            type="button"
            onClick={() => handleOpen(a.path, a.id)}
            disabled={openingId === a.id}
            className="min-w-0 flex-1 truncate text-left text-crimson hover:underline disabled:text-muted disabled:no-underline"
          >
            {a.name}
          </button>
        </li>
      ))}
    </ul>
  );
}

// 팀원 개인 업무일지(일반 텍스트): 줄 단위/제목 단위로 골라서 추가할 수 있다.
function TextEntryCard({
  entry,
  onAddBlock,
}: {
  entry: RecentEntry;
  onAddBlock: (html: string, attachments: RecentEntryAttachment[]) => void;
}) {
  const lines = (entry.content ?? "").split("\n").filter((line) => line.trim().length > 0);
  const hasTitle = Boolean(entry.visitedCustomers);
  const [titleChecked, setTitleChecked] = useState(false);
  const [checkedLines, setCheckedLines] = useState<boolean[]>(() => lines.map(() => false));
  const [checkedAttachments, setCheckedAttachments] = useState<boolean[]>(() => entry.attachments.map(() => false));

  function toggleTitle() {
    const next = !titleChecked;
    setTitleChecked(next);
    setCheckedLines(lines.map(() => next));
  }

  function toggleLine(i: number) {
    setCheckedLines((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  function toggleAttachment(i: number) {
    setCheckedAttachments((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  function handleAdd() {
    const selectedLines = lines.filter((_, i) => checkedLines[i]);
    const selectedAttachments = entry.attachments.filter((_, i) => checkedAttachments[i]);
    if (selectedLines.length === 0 && selectedAttachments.length === 0) return;

    let html = "";
    if (selectedLines.length > 0) {
      html =
        titleChecked && entry.visitedCustomers
          ? `<p><strong>${escapeHtml(entry.visitedCustomers)}</strong>(${entry.reportDate})</p>` +
            selectedLines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")
          : selectedLines.map((l) => `<p>${escapeHtml(l)}</p>`).join("") + `<p>(${entry.reportDate})</p>`;
    }
    onAddBlock(html, selectedAttachments);
  }

  return (
    <li className="border-b border-mist px-4 py-3 last:border-b-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-inktext">{entry.reportDate}</span>
        {hasTitle && (
          <label className="flex min-w-0 cursor-pointer items-center gap-1.5">
            <input type="checkbox" className="accent-crimson" checked={titleChecked} onChange={toggleTitle} />
            <span className="truncate text-xs text-muted">{entry.visitedCustomers}</span>
          </label>
        )}
      </div>
      {lines.length > 0 ? (
        <div className="mb-2 space-y-1">
          {lines.map((line, i) => (
            <label key={i} className="flex cursor-pointer items-start gap-2 py-0.5 text-xs text-inktext">
              <input
                type="checkbox"
                className="mt-0.5 accent-crimson"
                checked={checkedLines[i]}
                onChange={() => toggleLine(i)}
              />
              <span>{line}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="mb-2 text-xs text-muted">내용 없음</p>
      )}
      <AttachmentList attachments={entry.attachments} checkedAttachments={checkedAttachments} onToggle={toggleAttachment} />
      <button type="button" onClick={handleAdd} className="text-xs font-medium text-crimson hover:underline">
        선택한 내용 종합보고서에 추가
      </button>
    </li>
  );
}

// 하위 팀장의 종합보고서(HTML, 서식있는 편집기로 작성됨): 줄 단위 선택은 의미가 없어
// (표 등이 섞여있을 수 있음) 통째로 추가하는 방식으로만 지원한다.
function HtmlEntryCard({
  entry,
  onAddBlock,
}: {
  entry: RecentEntry;
  onAddBlock: (html: string, attachments: RecentEntryAttachment[]) => void;
}) {
  function handleAddWhole() {
    if (!entry.content && entry.attachments.length === 0) return;
    const html = entry.content ? `<p>(${entry.reportDate})</p>${entry.content}` : "";
    onAddBlock(html, entry.attachments);
  }

  return (
    <li className="border-b border-mist px-4 py-3 last:border-b-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-inktext">{entry.reportDate}</span>
      </div>
      <div className="mb-2 rounded-md border border-mist bg-salt px-3 py-2">
        {entry.content ? <RichTextViewer html={entry.content} /> : <p className="text-xs text-muted">내용 없음</p>}
      </div>
      <AttachmentList attachments={entry.attachments} />
      <button type="button" onClick={handleAddWhole} className="text-xs font-medium text-crimson hover:underline">
        전체 내용 종합보고서에 추가
      </button>
    </li>
  );
}

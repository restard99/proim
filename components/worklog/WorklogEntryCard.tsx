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
  const hasTitle = Boolean(entry.visitedCustomers);
  const [titleChecked, setTitleChecked] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function handleOpenAttachment(path: string, id: string) {
    setOpeningId(id);
    const url = await getAttachmentUrl(path);
    setOpeningId(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleAdd() {
    if (!entry.content && entry.attachments.length === 0) return;
    const header =
      titleChecked && entry.visitedCustomers
        ? `<p><strong>${escapeHtml(entry.visitedCustomers)}</strong>(${entry.reportDate})</p>`
        : `<p>(${entry.reportDate})</p>`;
    const html = entry.content ? `${header}${entry.content}` : "";
    onAddBlock(html, entry.attachments);
  }

  return (
    <li className="border-b border-mist px-4 py-3 last:border-b-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-inktext">{entry.reportDate}</span>
        {hasTitle && (
          <label className="flex min-w-0 cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              className="accent-crimson"
              checked={titleChecked}
              onChange={() => setTitleChecked((v) => !v)}
            />
            <span className="truncate text-xs text-muted">{entry.visitedCustomers}</span>
          </label>
        )}
      </div>
      <div className="mb-2 rounded-md border border-mist bg-salt px-3 py-2">
        {entry.content ? <RichTextViewer html={entry.content} /> : <p className="text-xs text-muted">내용 없음</p>}
      </div>
      {entry.attachments.length > 0 && (
        <ul className="mb-2 space-y-1">
          {entry.attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-xs">
              <AttachmentIcon />
              <button
                type="button"
                onClick={() => handleOpenAttachment(a.path, a.id)}
                disabled={openingId === a.id}
                className="min-w-0 flex-1 truncate text-left text-crimson hover:underline disabled:text-muted disabled:no-underline"
              >
                {a.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={handleAdd} className="text-xs font-medium text-crimson hover:underline">
        전체 내용 종합보고서에 추가
      </button>
    </li>
  );
}

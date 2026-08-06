"use client";

import { useState } from "react";
import type { RecentEntry, RecentEntryAttachment } from "@/app/actions/team-worklog";
import { getAttachmentUrl } from "@/app/actions/attachments";

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

export function WorklogEntryCard({
  entry,
  onAddSelected,
}: {
  entry: RecentEntry;
  onAddSelected: (lines: string[], attachments: RecentEntryAttachment[], title: string | null) => void;
}) {
  const lines = (entry.content ?? "").split("\n").filter((line) => line.trim().length > 0);
  const hasTitle = Boolean(entry.visitedCustomers);
  const [titleChecked, setTitleChecked] = useState(false);
  const [checkedLines, setCheckedLines] = useState<boolean[]>(() => lines.map(() => false));
  const [checkedAttachments, setCheckedAttachments] = useState<boolean[]>(() => entry.attachments.map(() => false));
  const [openingId, setOpeningId] = useState<string | null>(null);

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

  async function handleOpenAttachment(path: string, id: string) {
    setOpeningId(id);
    const url = await getAttachmentUrl(path);
    setOpeningId(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleAdd() {
    const selectedLines = lines.filter((_, i) => checkedLines[i]);
    const selectedAttachments = entry.attachments.filter((_, i) => checkedAttachments[i]);
    if (selectedLines.length === 0 && selectedAttachments.length === 0) return;
    onAddSelected(selectedLines, selectedAttachments, titleChecked ? entry.visitedCustomers : null);
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
      {entry.attachments.length > 0 && (
        <ul className="mb-2 space-y-1">
          {entry.attachments.map((a, i) => (
            <li key={a.id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="accent-crimson"
                checked={checkedAttachments[i]}
                onChange={() => toggleAttachment(i)}
              />
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
        선택한 내용 종합보고서에 추가
      </button>
    </li>
  );
}

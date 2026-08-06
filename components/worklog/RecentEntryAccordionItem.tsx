"use client";

import { useState } from "react";
import type { RecentEntry } from "@/app/actions/team-worklog";
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

export function RecentEntryAccordionItem({
  entry,
  onAddSelected,
}: {
  entry: RecentEntry;
  onAddSelected: (lines: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const lines = (entry.content ?? "").split("\n").filter((line) => line.trim().length > 0);
  const [checked, setChecked] = useState<boolean[]>(() => lines.map(() => false));
  const [openingId, setOpeningId] = useState<string | null>(null);

  function toggleLine(i: number) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  async function handleOpenAttachment(path: string, id: string) {
    setOpeningId(id);
    const url = await getAttachmentUrl(path);
    setOpeningId(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleAdd() {
    const selected = lines.filter((_, i) => checked[i]);
    if (selected.length === 0) return;
    onAddSelected(selected);
  }

  const summary = entry.visitedCustomers || lines[0] || "";

  return (
    <li className="border-b border-mist last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-mist/40"
      >
        <span className="shrink-0 text-sm text-inktext">{entry.reportDate}</span>
        <span className="ml-2 flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs text-muted">{summary}</span>
          {entry.attachments.length > 0 && <AttachmentIcon />}
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.2 7.2a1 1 0 0 1 1.4 0L10 10.6l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.6a1 1 0 0 1 0-1.4Z"
            />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          <div className="mb-2 space-y-1 border-t border-mist pt-2">
            {lines.map((line, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-2 py-0.5 text-xs text-inktext">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-crimson"
                  checked={checked[i]}
                  onChange={() => toggleLine(i)}
                />
                <span>{line}</span>
              </label>
            ))}
          </div>
          {entry.attachments.length > 0 && (
            <ul className="mb-2 space-y-1">
              {entry.attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-1.5 text-xs">
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
        </div>
      )}
    </li>
  );
}

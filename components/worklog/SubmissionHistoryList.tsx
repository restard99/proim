"use client";

import { useMemo, useState } from "react";
import type { TeamReportRow } from "@/app/actions/team-worklog";
import { getAttachmentUrl } from "@/app/actions/attachments";
import { FormattedText } from "./FormattedText";

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

export function SubmissionHistoryList({ rows }: { rows: TeamReportRow[] }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return rows;
    return rows.filter((r) => r.report_date.includes(q) || (r.content ?? "").includes(q));
  }, [rows, query]);

  async function handleOpenAttachment(path: string, id: string) {
    setOpeningAttachmentId(id);
    const url = await getAttachmentUrl(path);
    setOpeningAttachmentId(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="overflow-hidden rounded-lg border border-mist bg-white">
      <div className="border-b border-mist px-4 py-3.5">
        <div className="mb-2 text-sm font-semibold text-inktext">제출내역</div>
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.42 9.82l3.63 3.63a1 1 0 0 0 1.42-1.42l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5.5 9a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="날짜, 내용 검색"
            className="w-full rounded-md border border-mist py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted">
          {rows.length === 0 ? "제출한 종합 보고서가 없습니다." : "검색 결과가 없습니다."}
        </p>
      ) : (
        <ul className="divide-y divide-mist">
          {filtered.map((r) => {
            const open = openId === r.id;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-mist/40"
                >
                  <span className="text-sm text-inktext">{r.report_date}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "submitted" ? "bg-brine/10 text-brine" : "bg-mist text-muted"
                      }`}
                    >
                      {r.status === "submitted" ? "상신완료" : "미저장"}
                    </span>
                    <svg
                      className={`h-3.5 w-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
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
                    <p className="whitespace-pre-wrap border-t border-mist pt-2 text-xs text-inktext">
                      {r.content ? <FormattedText text={r.content} /> : "(내용 없음)"}
                    </p>
                    {r.attachments.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {r.attachments.map((a) => (
                          <li key={a.id} className="flex items-center gap-1.5 text-xs">
                            <AttachmentIcon />
                            <button
                              type="button"
                              onClick={() => handleOpenAttachment(a.path, a.id)}
                              disabled={openingAttachmentId === a.id}
                              className="min-w-0 flex-1 truncate text-left text-crimson hover:underline disabled:text-muted disabled:no-underline"
                            >
                              {a.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

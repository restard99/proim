"use client";

import { useState, useTransition } from "react";
import {
  deleteTeamReport,
  getPersonRecentEntries,
  linkTeamReportAttachment,
  saveTeamReport,
  unlinkTeamReportAttachment,
  type RosterEntry,
  type RecentEntry,
  type RecentEntryAttachment,
  type TeamReportAttachment,
  type TeamReportRow,
} from "@/app/actions/team-worklog";
import { getAttachmentUrl } from "@/app/actions/attachments";
import { RecentEntryAccordionItem } from "./RecentEntryAccordionItem";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toRecentEntry(row: TeamReportRow): RecentEntry {
  return {
    id: row.id,
    reportDate: row.report_date,
    status: row.status,
    content: row.content,
    visitedCustomers: null,
    attachments: row.attachments,
  };
}

type PendingAttachment = { path: string; name: string };

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

export function LeaderAggregateView({
  teamLabel,
  reportsToTeam,
  initialRoster,
  initialOwnTeamReports,
}: {
  teamLabel: string;
  reportsToTeam: string | null;
  initialRoster: RosterEntry[];
  initialOwnTeamReports: TeamReportRow[];
}) {
  const today = todayISO();
  const ownToday = initialOwnTeamReports.find((r) => r.report_date === today);

  const [content, setContent] = useState(ownToday?.content ?? "");
  const [status, setStatus] = useState<"draft" | "submitted">(ownToday?.status ?? "draft");
  const [hasSaved, setHasSaved] = useState(Boolean(ownToday));
  const [attachments, setAttachments] = useState<TeamReportAttachment[]>(ownToday?.attachments ?? []);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const [selectedPerson, setSelectedPerson] = useState<RosterEntry | null>(null);
  const [ownEntries] = useState<RecentEntry[]>(initialOwnTeamReports.map(toRecentEntry));
  const [personEntries, setPersonEntries] = useState<RecentEntry[]>([]);
  const [isLoadingPerson, startPersonTransition] = useTransition();

  const panelTitle = selectedPerson ? `${selectedPerson.name} · 최근 제출내역(1주)` : "최근 제출 내역";
  const panelEntries = selectedPerson ? personEntries : ownEntries;

  const memberCount = initialRoster.filter((r) => r.kind === "member").length;
  const memberSubmitted = initialRoster.filter((r) => r.kind === "member" && r.submittedToday).length;

  function handleSelectPerson(person: RosterEntry) {
    setSelectedPerson(person);
    startPersonTransition(async () => {
      const entries = await getPersonRecentEntries(person.id, person.kind);
      setPersonEntries(entries);
    });
  }

  function handleAddSelected(entryDate: string, lines: string[], selectedAttachments: RecentEntryAttachment[]) {
    if (lines.length > 0) {
      setContent((prev) => `${prev}${prev ? "\n\n" : ""}${lines.join("\n")}\n(${entryDate})`);
    }
    if (selectedAttachments.length > 0) {
      setPendingAttachments((prev) => {
        const existingPaths = new Set([...attachments.map((a) => a.path), ...prev.map((a) => a.path)]);
        const additions = selectedAttachments
          .filter((a) => !existingPaths.has(a.path))
          .map((a) => ({ path: a.path, name: a.name }));
        return [...prev, ...additions];
      });
    }
  }

  function handleSave() {
    setError(null);
    startSaveTransition(async () => {
      const result = await saveTeamReport({ reportDate: today, content, status: "submitted" });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStatus("submitted");
      setHasSaved(true);

      if (pendingAttachments.length > 0) {
        const linked: TeamReportAttachment[] = [];
        const failedNames: string[] = [];
        for (const p of pendingAttachments) {
          const linkResult = await linkTeamReportAttachment(result.id, p.path, p.name);
          if (linkResult.ok) linked.push(linkResult.attachment);
          else failedNames.push(p.name);
        }
        setAttachments((prev) => [...prev, ...linked]);
        setPendingAttachments([]);
        if (failedNames.length > 0) {
          setError(`보고서는 저장됐지만 다음 첨부파일 연결에 실패했습니다: ${failedNames.join(", ")}`);
        }
      }
    });
  }

  function handleRemovePending(index: number) {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleRemoveAttachment(attachment: TeamReportAttachment) {
    setRemovingId(attachment.id);
    unlinkTeamReportAttachment(attachment.id).then((result) => {
      setRemovingId(null);
      if (!result.ok) {
        window.alert(result.message);
        return;
      }
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    });
  }

  async function handleOpenAttachment(path: string, id: string) {
    setOpeningId(id);
    const url = await getAttachmentUrl(path);
    setOpeningId(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleDeleteOrClear() {
    if (!hasSaved) {
      setContent("");
      setPendingAttachments([]);
      setError(null);
      return;
    }
    if (!window.confirm("오늘 작성한 종합 보고서를 삭제할까요? 연결된 첨부파일 참조도 함께 삭제됩니다.")) return;

    setError(null);
    startDeleteTransition(async () => {
      const result = await deleteTeamReport(today);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setContent("");
      setStatus("draft");
      setHasSaved(false);
      setAttachments([]);
      setPendingAttachments([]);
    });
  }

  return (
    <div className="grid max-w-7xl grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[220px_300px_1fr] lg:px-8">
      {/* 왼쪽: 제출 현황 */}
      <div className="h-fit overflow-hidden rounded-lg border border-mist bg-white">
        <div className="border-b border-mist px-4 py-3.5">
          <h2 className="text-sm font-semibold text-inktext">
            제출 현황 ({memberSubmitted}/{memberCount})
          </h2>
        </div>
        <ul className="divide-y divide-mist text-sm">
          <li
            onClick={() => setSelectedPerson(null)}
            className={`cursor-pointer px-4 py-3 transition-colors hover:bg-mist/40 ${
              !selectedPerson ? "bg-crimson/5" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-inktext">본인</span>
              <span className="rounded-full bg-mist px-2 py-0.5 text-xs font-medium text-ink">본인</span>
            </div>
          </li>
          {initialRoster.map((person) => (
            <li
              key={person.id}
              onClick={() => handleSelectPerson(person)}
              className={`cursor-pointer px-4 py-3 transition-colors hover:bg-mist/40 ${
                selectedPerson?.id === person.id ? "bg-crimson/5" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-medium text-inktext">
                  {person.name}
                  {person.kind === "team" && (
                    <span className="ml-1 text-xs font-normal text-muted">· {person.team}장</span>
                  )}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    person.submittedToday ? "bg-brine/10 text-brine" : "bg-mist text-muted"
                  }`}
                >
                  {person.submittedToday ? (person.kind === "team" ? "상신완료" : "제출") : "미제출"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 가운데: 최근 제출 내역 */}
      <div className="h-fit overflow-hidden rounded-lg border border-mist bg-white">
        <div className="flex items-center justify-between border-b border-mist px-4 py-3.5">
          <span className="text-sm font-semibold text-inktext">{panelTitle}</span>
          {selectedPerson && (
            <button
              type="button"
              onClick={() => setSelectedPerson(null)}
              className="text-xs font-medium text-crimson hover:underline"
            >
              ← 내 제출내역
            </button>
          )}
        </div>
        {isLoadingPerson ? (
          <p className="px-4 py-6 text-center text-xs text-muted">불러오는 중…</p>
        ) : panelEntries.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted">최근 제출 내역이 없습니다.</p>
        ) : (
          <ul>
            {panelEntries.map((entry) => (
              <RecentEntryAccordionItem
                key={entry.id}
                entry={entry}
                onAddSelected={(lines, atts) => handleAddSelected(entry.reportDate, lines, atts)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* 오른쪽: 종합 보고서 */}
      <div className="space-y-4">
        <div className="rounded-lg border border-mist bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-inktext">
              {teamLabel} 종합 보고서 — {today}
            </h2>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                status === "submitted" ? "bg-brine/10 text-brine" : "bg-mist text-muted"
              }`}
            >
              {status === "submitted" ? "상신완료" : "미저장"}
            </span>
          </div>
          <textarea
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-md border border-mist px-3.5 py-3 text-sm leading-relaxed outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
          />

          {(attachments.length > 0 || pendingAttachments.length > 0) && (
            <ul className="mt-3 space-y-1.5">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-md border border-mist bg-salt px-3 py-2 text-sm">
                  <AttachmentIcon />
                  <button
                    type="button"
                    onClick={() => handleOpenAttachment(a.path, a.id)}
                    disabled={openingId === a.id}
                    className="min-w-0 flex-1 truncate text-left text-crimson hover:underline disabled:text-muted disabled:no-underline"
                  >
                    {a.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(a)}
                    disabled={removingId === a.id}
                    className="shrink-0 text-xs font-medium text-muted hover:text-crimsond disabled:opacity-50"
                  >
                    삭제
                  </button>
                </li>
              ))}
              {pendingAttachments.map((p, i) => (
                <li
                  key={`pending-${i}`}
                  className="flex items-center gap-2 rounded-md border border-dashed border-mist bg-salt px-3 py-2 text-sm"
                >
                  <AttachmentIcon />
                  <span className="min-w-0 flex-1 truncate text-muted">{p.name} (저장 시 연결됩니다)</span>
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
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-sand/60 bg-sand/10 px-4 py-3.5 text-sm text-inktext">
          <svg className="h-4 w-4 shrink-0 text-brine" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.3.7l2.5 2.5a1 1 0 001.4-1.4L11 10.6V6z"
            />
          </svg>
          {reportsToTeam ? (
            <span>
              이 보고서는 <strong className="font-semibold">{reportsToTeam} 팀장</strong>에게 상신됩니다.
            </span>
          ) : (
            <span>
              이 보고서는 <strong className="font-semibold">사장님</strong>에게 최종 상신됩니다.
            </span>
          )}
        </div>

        {error && <p className="text-sm text-crimsond">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={isSaving || isDeleting}
            onClick={handleDeleteOrClear}
            className="rounded-md border border-mist px-4 py-2.5 text-sm font-medium text-crimsond transition-colors hover:bg-crimson/5 disabled:opacity-50"
          >
            삭제
          </button>
          <button
            type="button"
            disabled={isSaving || isDeleting}
            onClick={handleSave}
            className="rounded-md bg-crimson px-4 py-2.5 text-sm font-medium text-salt transition-colors hover:bg-crimsond disabled:opacity-50"
          >
            {reportsToTeam ? `${reportsToTeam}장에게 상신` : "사장님에게 최종 상신"}
          </button>
        </div>
      </div>
    </div>
  );
}

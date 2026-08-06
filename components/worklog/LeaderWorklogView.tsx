"use client";

import { useState } from "react";
import { MemberWorklogView } from "./MemberWorklogView";
import { LeaderAggregateView } from "./LeaderAggregateView";
import type { DailyReportRow } from "@/app/actions/worklog";
import type { RosterEntry, TeamReportRow } from "@/app/actions/team-worklog";

export function LeaderWorklogView({
  initialOwnDailyReports,
  teamLabel,
  reportsToTeam,
  initialRoster,
  initialOwnTeamReports,
}: {
  initialOwnDailyReports: DailyReportRow[];
  teamLabel: string;
  reportsToTeam: string | null;
  initialRoster: RosterEntry[];
  initialOwnTeamReports: TeamReportRow[];
}) {
  const [tab, setTab] = useState<"write" | "aggregate">("aggregate");

  return (
    <div>
      <div className="border-b border-mist bg-white px-5 py-3 lg:px-8">
        <div className="inline-flex gap-1 rounded-lg border border-mist bg-salt p-1">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "write" ? "bg-ink text-salt" : "text-muted"
            }`}
          >
            업무일지 작성
          </button>
          <button
            type="button"
            onClick={() => setTab("aggregate")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "aggregate" ? "bg-ink text-salt" : "text-muted"
            }`}
          >
            업무일지 취합
          </button>
        </div>
      </div>

      {tab === "write" ? (
        <MemberWorklogView initialReports={initialOwnDailyReports} submitLabel="저장하기" />
      ) : (
        <LeaderAggregateView
          teamLabel={teamLabel}
          reportsToTeam={reportsToTeam}
          initialRoster={initialRoster}
          initialOwnDailyReports={initialOwnDailyReports}
          initialOwnTeamReports={initialOwnTeamReports}
        />
      )}
    </div>
  );
}

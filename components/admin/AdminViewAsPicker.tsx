"use client";

import { useMemo, useState, useTransition } from "react";
import { startViewAs } from "@/app/actions/view-as";
import type { AdminUserRow } from "@/app/actions/admin-users";

function roleLabel(role: string) {
  if (role === "leader") return "팀장";
  if (role === "ceo") return "대표";
  return "팀원";
}

export function AdminViewAsPicker({ users }: { users: AdminUserRow[] }) {
  const teams = useMemo(() => Array.from(new Set(users.map((u) => u.team))), [users]);
  const [activeTeam, setActiveTeam] = useState(teams[0] ?? "");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const teamUsers = users.filter((u) => u.team === activeTeam);

  function handleSelect(target: AdminUserRow) {
    setError(null);
    setPendingId(target.id);
    startTransition(async () => {
      const result = await startViewAs(target.id);
      if (!result.ok) {
        setError(result.message);
        setPendingId(null);
      }
    });
  }

  if (teams.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-mist bg-white px-6 py-10 text-center text-sm text-muted">
        전환할 수 있는 계정이 없습니다.
      </div>
    );
  }

  return (
    <div>
      <div className="mt-6 flex gap-1 border-b border-mist overflow-x-auto">
        {teams.map((team) => (
          <button
            key={team}
            type="button"
            onClick={() => setActiveTeam(team)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              team === activeTeam
                ? "border-crimson text-crimson bg-crimson/5"
                : "border-transparent text-muted hover:text-inktext"
            }`}
          >
            {team}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-md bg-crimson/10 text-crimsond text-sm px-4 py-2.5">{error}</p>}

      {isPending && pendingId && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-mist border-t-crimson animate-spin" />
          전환하는 중...
        </p>
      )}

      {teamUsers.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-mist bg-white px-6 py-10 text-center text-sm text-muted">
          {activeTeam}에 등록된 계정이 없습니다.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teamUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(u)}
              className="flex items-center gap-3 rounded-lg border border-mist bg-white p-4 text-left transition-colors hover:border-crimson/40 hover:bg-crimson/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-mist flex items-center justify-center text-sm font-medium text-inktext">
                {u.full_name.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-inktext">{u.full_name}</p>
                <p className="truncate text-xs text-muted">
                  {u.team} · {roleLabel(u.role)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

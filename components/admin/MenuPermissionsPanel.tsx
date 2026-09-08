"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getUserMenuGrants,
  setUserMenuGrant,
  type GrantableUser,
} from "@/app/actions/menu-permissions";
import { GRANTABLE_MENU_ITEMS } from "@/components/layout/nav-items";

// 그룹 순서를 화면에 늘 같은 순서로 보여주기 위해 GRANTABLE_MENU_ITEMS를 순회하며 그룹핑한다
// (Object 순회 순서에 기대지 않고, 목록 자체의 등장 순서를 그대로 따른다).
function groupMenuItems() {
  const groups: { group: string; entries: typeof GRANTABLE_MENU_ITEMS }[] = [];
  for (const entry of GRANTABLE_MENU_ITEMS) {
    let g = groups.find((g) => g.group === entry.group);
    if (!g) {
      g = { group: entry.group, entries: [] };
      groups.push(g);
    }
    g.entries.push(entry);
  }
  return groups;
}

const MENU_GROUPS = groupMenuItems();

type SaveState = "idle" | "saving" | "saved";

function UserGrantEditor({ user }: { user: GrantableUser }) {
  const [grantedHrefs, setGrantedHrefs] = useState<Set<string> | null>(null);
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // 부모(MenuPermissionsPanel)가 선택된 사용자 id를 key로 써서 사용자를 바꿀 때마다 이
  // 컴포넌트를 통째로 새로 마운트한다 — 그래서 각 state의 초기값(null/{}/null) 자체가 곧
  // "리셋된 상태"라 effect 안에서 따로 리셋할 필요가 없다.
  useEffect(() => {
    (async () => {
      const result = await getUserMenuGrants(user.id);
      setGrantedHrefs(new Set(result.ok ? result.hrefs : []));
      if (!result.ok) setError(result.message);
    })();
  }, [user.id]);

  function toggle(href: string, checked: boolean) {
    setSaveState((prev) => ({ ...prev, [href]: "saving" }));
    startTransition(async () => {
      const result = await setUserMenuGrant(user.id, href, checked);
      if (!result.ok) {
        setError(result.message);
        setSaveState((prev) => ({ ...prev, [href]: "idle" }));
        return;
      }
      setGrantedHrefs((prev) => {
        const next = new Set(prev);
        if (checked) next.add(href);
        else next.delete(href);
        return next;
      });
      setSaveState((prev) => ({ ...prev, [href]: "saved" }));
      setTimeout(() => setSaveState((prev) => ({ ...prev, [href]: "idle" })), 1500);
    });
  }

  if (grantedHrefs === null) {
    return (
      <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
        <p className="text-sm text-muted">불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-mist bg-white px-4 py-3.5">
        <p className="text-sm font-semibold text-inktext">
          {user.full_name} <span className="ml-1 text-xs font-normal text-muted">{user.team} · {roleLabel(user.role)}</span>
        </p>
      </div>

      {error && <p className="text-xs text-crimsond">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-mist bg-white">
        {MENU_GROUPS.map(({ group, entries }) => (
          <div key={group}>
            <div className="border-b border-t border-mist bg-mist/40 px-4 py-2 text-xs font-semibold text-muted first:border-t-0">
              {group}
            </div>
            <ul className="divide-y divide-mist text-sm">
              {entries.map(({ item, check }) => {
                const alreadyVisible = check(user.team, user.role);
                const href = item.href;
                const state = saveState[href] ?? "idle";
                return (
                  <li key={href} className={`flex items-center justify-between px-4 py-3 ${alreadyVisible ? "bg-salt/60" : ""}`}>
                    <span className="text-inktext">{item.label}</span>
                    {alreadyVisible ? (
                      <span className="rounded-full bg-brine/10 px-2 py-0.5 text-xs font-medium text-brine">
                        팀 규칙으로 이미 보임
                      </span>
                    ) : (
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={grantedHrefs.has(href)}
                          onChange={(e) => toggle(href, e.target.checked)}
                          disabled={state === "saving"}
                          className="h-4 w-4 rounded border-mist accent-brine"
                        />
                        <span className={`text-xs ${state === "saved" ? "text-brine" : "text-muted"}`}>
                          {state === "saving" ? "저장 중…" : state === "saved" ? "저장됨 ✓" : "추가 허용"}
                        </span>
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted/70">
        체크하면 바로 저장됩니다. &quot;팀 규칙으로 이미 보임&quot; 항목은 소속팀 규칙 때문에 이미 보이는 메뉴라 개별로 끌 수 없습니다.
      </p>
    </div>
  );
}

function roleLabel(role: string) {
  return role === "leader" ? "팀장" : "팀원";
}

export function MenuPermissionsPanel({ users }: { users: GrantableUser[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(users[0]?.id ?? null);
  const selectedUser = users.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        소속팀 규칙으로는 원래 안 보이는 메뉴를, 이 사람에게만 추가로 열어줄 수 있습니다. 팀 규칙으로 이미 보이는 메뉴는 회수할 수 없습니다.
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="h-fit overflow-hidden rounded-lg border border-mist bg-white">
          <div className="border-b border-mist px-4 py-3 text-sm font-semibold text-inktext">사용자</div>
          <ul className="divide-y divide-mist text-sm max-h-[560px] overflow-y-auto">
            {users.map((u) => (
              <li
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                className={`cursor-pointer px-4 py-3 transition-colors hover:bg-mist/40 ${
                  u.id === selectedId ? "border-l-2 border-crimson bg-crimson/5" : ""
                }`}
              >
                <p className="font-medium text-inktext">{u.full_name}</p>
                <p className="mt-0.5 text-xs text-muted">{u.team} · {roleLabel(u.role)}</p>
              </li>
            ))}
            {users.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted">대상 사용자가 없습니다.</li>}
          </ul>
        </div>

        {selectedUser ? (
          <UserGrantEditor key={selectedUser.id} user={selectedUser} />
        ) : (
          <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
            <p className="text-sm text-muted">왼쪽에서 사용자를 선택해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

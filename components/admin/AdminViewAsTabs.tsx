"use client";

import { useState } from "react";
import { AdminViewAsPicker } from "@/components/admin/AdminViewAsPicker";
import { MenuPermissionsPanel } from "@/components/admin/MenuPermissionsPanel";
import type { AdminUserRow } from "@/app/actions/admin-users";
import type { GrantableUser } from "@/app/actions/menu-permissions";

type Tab = "view-as" | "menu-permissions";

const TABS: { key: Tab; label: string }[] = [
  { key: "view-as", label: "계정으로 보기" },
  { key: "menu-permissions", label: "게시판 권한" },
];

export function AdminViewAsTabs({
  viewAsCandidates,
  grantableUsers,
}: {
  viewAsCandidates: AdminUserRow[];
  grantableUsers: GrantableUser[];
}) {
  const [tab, setTab] = useState<Tab>("view-as");

  return (
    <div className="space-y-6">
      <div className="inline-flex gap-1 rounded-lg border border-mist bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-ink text-salt" : "text-muted hover:bg-mist"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "view-as" && (
        <div>
          <h2 className="text-xl font-semibold text-inktext">시스템검토 게시판</h2>
          <p className="mt-1.5 text-sm text-muted">
            부서를 선택하고 담당자를 클릭하면, 그 계정으로 로그인한 것처럼 화면을 확인할 수 있습니다.
          </p>
          <AdminViewAsPicker users={viewAsCandidates} />
        </div>
      )}

      {tab === "menu-permissions" && (
        <div>
          <h2 className="text-xl font-semibold text-inktext">게시판 권한</h2>
          <p className="mt-1.5 text-sm text-muted">
            소속팀 규칙으로는 원래 안 보이는 메뉴를 특정 사람에게만 추가로 열어줄 수 있습니다.
          </p>
          <div className="mt-4">
            <MenuPermissionsPanel users={grantableUsers} />
          </div>
        </div>
      )}
    </div>
  );
}

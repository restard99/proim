"use client";

import { useState } from "react";
import { ApprovalTable, type PendingProfile } from "@/components/admin/ApprovalTable";
import { UserAccountTable } from "@/components/admin/UserAccountTable";
import type { AdminUserRow } from "@/app/actions/admin-users";

type Tab = "approvals" | "users";

const TABS: { key: Tab; label: string }[] = [
  { key: "approvals", label: "가입 승인" },
  { key: "users", label: "전체 사용자" },
];

export function AdminApprovalsTabs({
  pending,
  allUsers,
}: {
  pending: PendingProfile[];
  allUsers: AdminUserRow[];
}) {
  const [tab, setTab] = useState<Tab>("approvals");

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
            {t.key === "approvals" && pending.length > 0 && (
              <span className="ml-1.5 rounded-full bg-crimson/10 px-1.5 py-0.5 text-[11px] text-crimsond">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "approvals" && (
        <div>
          <h2 className="text-xl font-semibold text-inktext">가입 승인 관리</h2>
          <p className="mt-1.5 text-sm text-muted">새로 가입한 계정을 확인하고 승인하거나 반려하세요.</p>
          <ApprovalTable pending={pending} />
        </div>
      )}

      {tab === "users" && (
        <div>
          <h2 className="text-xl font-semibold text-inktext">전체 사용자</h2>
          <p className="mt-1.5 text-sm text-muted">비밀번호를 잊은 사용자를 위해 임시 비밀번호를 발급할 수 있습니다.</p>
          <UserAccountTable users={allUsers} />
        </div>
      )}
    </div>
  );
}

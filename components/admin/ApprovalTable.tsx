"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveUser, rejectUser } from "@/app/actions/approvals";
import { SIGNUP_ROLES } from "@/lib/auth/constants";

export interface PendingProfile {
  id: string;
  full_name: string;
  team: string;
  role: string;
  created_at: string;
}

function roleLabel(role: string) {
  return SIGNUP_ROLES.find((r) => r.value === role)?.label ?? role;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ApprovalRow({ profile }: { profile: PendingProfile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const handle = (kind: "approve" | "reject") => {
    setError(null);
    setAction(kind);
    startTransition(async () => {
      const result = kind === "approve" ? await approveUser(profile.id) : await rejectUser(profile.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <tr>
      <td className="px-4 py-3.5 font-medium">{profile.full_name}</td>
      <td className="px-4 py-3.5 text-muted">{profile.team}</td>
      <td className="px-4 py-3.5 text-muted">{roleLabel(profile.role)}</td>
      <td className="px-4 py-3.5 text-muted font-mono text-xs">{formatDateTime(profile.created_at)}</td>
      <td className="px-4 py-3.5">
        <div className="flex justify-end items-center gap-2">
          {error && <span className="text-xs text-crimsond">{error}</span>}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handle("approve")}
            className="rounded-md bg-crimson hover:bg-crimsond disabled:bg-crimson/60 text-salt text-xs font-medium px-3 py-1.5 transition-colors"
          >
            {isPending && action === "approve" ? "처리 중…" : "승인"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handle("reject")}
            className="rounded-md border border-mist hover:bg-mist/50 disabled:opacity-60 text-inktext text-xs font-medium px-3 py-1.5 transition-colors"
          >
            {isPending && action === "reject" ? "처리 중…" : "반려"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ApprovalTable({ pending }: { pending: PendingProfile[] }) {
  if (pending.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-mist flex items-center justify-center">
          <svg className="h-6 w-6 text-muted" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-inktext">대기 중인 가입 요청이 없습니다</p>
        <p className="mt-1 text-sm text-muted">새 가입 요청이 오면 이 목록에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-mist bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">이름</th>
            <th className="px-4 py-3 font-medium">소속팀</th>
            <th className="px-4 py-3 font-medium">직급</th>
            <th className="px-4 py-3 font-medium">가입 요청일시</th>
            <th className="px-4 py-3 font-medium text-right">처리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mist">
          {pending.map((profile) => (
            <ApprovalRow key={profile.id} profile={profile} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetUserPassword, updateUserEmail, type AdminUserRow } from "@/app/actions/admin-users";
import { SIGNUP_ROLES } from "@/lib/auth/constants";

function roleLabel(role: string) {
  return SIGNUP_ROLES.find((r) => r.value === role)?.label ?? role;
}

function statusLabel(status: string) {
  if (status === "approved") return "승인됨";
  if (status === "pending") return "대기중";
  if (status === "rejected") return "반려됨";
  return status;
}

function ResetResultModal({ tempPassword, onClose }: { tempPassword: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-inktext">임시 비밀번호 발급</h2>
        <p className="mt-1.5 text-sm text-muted">
          아래 임시 비밀번호를 사용자에게 안전하게 전달하세요. 이 창을 닫으면 다시 확인할 수 없습니다.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-md border border-mist bg-salt px-3.5 py-2.5">
          <code className="flex-1 text-sm font-mono text-inktext">{tempPassword}</code>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md border border-mist bg-white px-2.5 py-1 text-xs font-medium text-inktext hover:bg-mist/50 transition-colors"
          >
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-md bg-crimson hover:bg-crimsond text-salt text-sm font-medium px-4 py-2.5 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
}

function EmailCell({ userId, email }: { userId: string; email: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(email ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateUserEmail(userId, value);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(email ?? "");
          setError(null);
          setEditing(true);
        }}
        className="text-left hover:underline decoration-dotted"
        title="클릭해서 이메일 수정"
      >
        {email ?? <span className="text-muted/60">미등록</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isPending}
        autoFocus
        className="w-48 rounded-md border border-mist bg-white px-2 py-1 text-xs outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="rounded-md bg-crimson hover:bg-crimsond disabled:opacity-60 text-salt text-xs font-medium px-2 py-1 transition-colors"
      >
        저장
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={isPending}
        className="text-xs text-muted hover:text-inktext"
      >
        취소
      </button>
      {error && <span className="text-xs text-crimsond">{error}</span>}
    </div>
  );
}

function UserRow({ user, onReset }: { user: AdminUserRow; onReset: (id: string) => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await resetUserPassword(user.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onReset(result.tempPassword);
    });
  };

  return (
    <tr>
      <td className="px-4 py-3.5 font-medium">{user.full_name}</td>
      <td className="px-4 py-3.5 text-muted">{user.team}</td>
      <td className="px-4 py-3.5 text-muted">{roleLabel(user.role)}</td>
      <td className="px-4 py-3.5 text-muted">{statusLabel(user.status)}</td>
      <td className="px-4 py-3.5 text-muted">
        <EmailCell userId={user.id} email={user.email} />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex justify-end items-center gap-2">
          {error && <span className="text-xs text-crimsond">{error}</span>}
          <button
            type="button"
            disabled={isPending}
            onClick={handleClick}
            className="rounded-md border border-mist hover:bg-mist/50 disabled:opacity-60 text-inktext text-xs font-medium px-3 py-1.5 transition-colors"
          >
            {isPending ? "처리 중…" : "비밀번호 재설정"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function UserAccountTable({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");
  const [resetResult, setResetResult] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return users;
    return users.filter((u) => u.full_name.includes(q) || u.team.includes(q));
  }, [users, query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름 또는 소속팀 검색"
        className="w-full max-w-xs rounded-md border border-mist bg-white px-3.5 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
      />

      <div className="mt-4 rounded-lg border border-mist bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">소속팀</th>
              <th className="px-4 py-3 font-medium">직급</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium text-right">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {filtered.map((user) => (
              <UserRow key={user.id} user={user} onReset={setResetResult} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {resetResult && <ResetResultModal tempPassword={resetResult} onClose={() => setResetResult(null)} />}
    </div>
  );
}

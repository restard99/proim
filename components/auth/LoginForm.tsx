"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { signIn, lookupTeamsByName, type SignInState } from "@/app/actions/auth";
import { TEAMS } from "@/lib/auth/constants";

const initialState: SignInState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const teamSelectRef = useRef<HTMLSelectElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [isMatching, setIsMatching] = useState(false);
  // 사용자가 소속팀을 직접 선택한 뒤에는 이름 자동완성이 그 값을 덮어쓰면 안 된다.
  const teamTouchedRef = useRef(false);
  // 엔터 키 처리에서 이미 조회를 실행했다면, 뒤이어 발생하는 blur에서 중복 조회하지 않는다.
  const enterHandledRef = useRef(false);

  const handleNameChange = () => {
    // 이름이 바뀌면 이전 자동완성/수동 선택은 더 이상 유효하지 않으므로 다시 자동완성을 허용한다.
    teamTouchedRef.current = false;
  };

  const handleTeamChange = () => {
    teamTouchedRef.current = true;
  };

  const runTeamLookup = async (name: string) => {
    if (!name || name.includes("@")) return;

    setIsMatching(true);
    try {
      const teams = await lookupTeamsByName(name);
      if (teams.length === 1 && teamSelectRef.current && !teamTouchedRef.current) {
        teamSelectRef.current.value = teams[0];
      }
    } finally {
      setIsMatching(false);
    }
  };

  const handleNameBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    if (enterHandledRef.current) {
      enterHandledRef.current = false;
      return;
    }
    await runTeamLookup(e.target.value.trim());
  };

  const handleNameKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    enterHandledRef.current = true;
    await runTeamLookup(e.currentTarget.value.trim());
    passwordRef.current?.focus();
  };

  const fieldErrors = state.status === "error" && state.error === "validation" ? state.fieldErrors : {};
  const isCredentialError = state.status === "error" && state.error === "invalid-credentials";
  const isPendingApprovalError = state.status === "error" && state.error === "pending-approval";

  const borderClass = (hasError: boolean) =>
    hasError
      ? "border-crimson/50 focus:border-crimson focus:ring-crimson/30"
      : "border-mist focus:border-brine focus:ring-brine/30";

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold text-inktext">로그인</h1>
      <p className="mt-1.5 text-sm text-muted">이름, 소속팀, 비밀번호를 입력하세요.</p>

      {isCredentialError && (
        <div className="mt-6 flex items-start gap-2.5 rounded-md bg-crimson/10 border border-crimson/30 px-3.5 py-3 text-sm text-crimsond">
          <svg className="h-5 w-5 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 112 0 1 1 0 01-2 0zm1-9a1 1 0 00-1 1v4a1 1 0 002 0V5a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>이름, 소속팀 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요.</span>
        </div>
      )}

      {isPendingApprovalError && (
        <div className="mt-6 flex items-start gap-2.5 rounded-md bg-sand/20 border border-sand/60 px-3.5 py-3 text-sm text-ink">
          <svg className="h-5 w-5 mt-0.5 shrink-0 text-brine" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 00.3.7l2.5 2.5a1 1 0 001.4-1.4L11 10.6V7z"
              clipRule="evenodd"
            />
          </svg>
          <span>아직 관리자 승인이 완료되지 않았습니다. 승인 후 다시 로그인해주세요.</span>
        </div>
      )}

      <form action={formAction} className="mt-4 space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-inktext mb-1.5">
            이름
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="홍길동"
            onBlur={handleNameBlur}
            onChange={handleNameChange}
            onKeyDown={handleNameKeyDown}
            className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${borderClass(!!fieldErrors.fullName || isCredentialError)}`}
          />
          <p className="mt-1 text-xs text-muted">
            {isMatching
              ? "소속팀을 확인하는 중…"
              : "동명이인이 있을 수 있어 소속팀과 함께 계정을 구분합니다. 입력 후 엔터를 치세요."}
          </p>
          {fieldErrors.fullName && <p className="mt-1 text-xs text-crimsond">{fieldErrors.fullName}</p>}
        </div>

        <div>
          <label htmlFor="team" className="block text-sm font-medium text-inktext mb-1.5">
            소속팀 <span className="text-muted font-normal">(관리자는 선택하지 않아도 됩니다)</span>
          </label>
          <select
            id="team"
            name="team"
            defaultValue=""
            ref={teamSelectRef}
            onChange={handleTeamChange}
            className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${borderClass(!!fieldErrors.team || isCredentialError)}`}
          >
            <option value="" disabled>
              선택하세요
            </option>
            {TEAMS.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
          {fieldErrors.team && <p className="mt-1 text-xs text-crimsond">{fieldErrors.team}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-inktext">
              비밀번호
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-crimson hover:underline">
              비밀번호 찾기
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            ref={passwordRef}
            className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${borderClass(!!fieldErrors.password || isCredentialError)}`}
          />
          {fieldErrors.password && <p className="mt-1 text-xs text-crimsond">{fieldErrors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-crimson hover:bg-crimsond disabled:bg-crimson/70 disabled:cursor-not-allowed text-salt text-sm font-medium py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-crimson/40 focus:ring-offset-2"
        >
          {isPending && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {isPending ? "확인하는 중…" : "로그인"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-mist text-sm text-center text-muted">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-crimson font-medium hover:underline">
          회원가입
        </Link>
      </div>
    </div>
  );
}

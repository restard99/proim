"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type SignUpState } from "@/app/actions/auth";
import { TEAMS, SIGNUP_ROLES } from "@/lib/auth/constants";

const initialState: SignUpState = { status: "idle" };

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  const fieldErrors = state.status === "error" && state.error === "validation" ? state.fieldErrors : {};
  const bannerMessage =
    state.status === "error" && state.error === "duplicate-name"
      ? "이미 등록된 이름입니다. 동명이인이라면 관리자에게 문의해주세요."
      : state.status === "error" && state.error === "unknown"
        ? state.message
        : null;

  const borderClass = (hasError: boolean) =>
    hasError
      ? "border-crimson/50 focus:border-crimson focus:ring-crimson/30"
      : "border-mist focus:border-brine focus:ring-brine/30";

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold text-inktext">회원가입</h1>
      <p className="mt-1.5 text-sm text-muted">
        이름, 소속팀, 직급을 입력하면 관리자 승인 후 이용할 수 있습니다.
      </p>

      {bannerMessage && (
        <div className="mt-6 flex items-start gap-2.5 rounded-md bg-crimson/10 border border-crimson/30 px-3.5 py-3 text-sm text-crimsond">
          <svg className="h-5 w-5 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 112 0 1 1 0 01-2 0zm1-9a1 1 0 00-1 1v4a1 1 0 002 0V5a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{bannerMessage}</span>
        </div>
      )}

      <form action={formAction} className="mt-7 space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-inktext mb-1.5">
            이름
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="홍길동"
            className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${borderClass(!!fieldErrors.fullName)}`}
          />
          <p className="mt-1 text-xs text-muted">이름이 곧 로그인 아이디로 사용됩니다.</p>
          {fieldErrors.fullName && <p className="mt-1 text-xs text-crimsond">{fieldErrors.fullName}</p>}
        </div>

        <div>
          <label htmlFor="team" className="block text-sm font-medium text-inktext mb-1.5">
            소속팀
          </label>
          <select
            id="team"
            name="team"
            defaultValue=""
            className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${borderClass(!!fieldErrors.team)}`}
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
          <span className="block text-sm font-medium text-inktext mb-1.5">직급</span>
          <div className="grid grid-cols-3 gap-2">
            {SIGNUP_ROLES.map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center justify-center gap-1.5 rounded-md border border-mist px-3 py-2.5 text-sm cursor-pointer has-[:checked]:border-crimson has-[:checked]:bg-crimson/5 has-[:checked]:text-crimsond"
              >
                <input type="radio" name="role" value={value} className="accent-crimson" />
                {label}
              </label>
            ))}
          </div>
          {fieldErrors.role && <p className="mt-1 text-xs text-crimsond">{fieldErrors.role}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-inktext mb-1.5">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="8자 이상"
            className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${borderClass(!!fieldErrors.password)}`}
          />
          {fieldErrors.password && <p className="mt-1 text-xs text-crimsond">{fieldErrors.password}</p>}
        </div>

        <div>
          <label htmlFor="passwordConfirm" className="block text-sm font-medium text-inktext mb-1.5">
            비밀번호 확인
          </label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            placeholder="다시 입력하세요"
            className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${borderClass(!!fieldErrors.passwordConfirm)}`}
          />
          {fieldErrors.passwordConfirm && (
            <p className="mt-1 text-xs text-crimsond">{fieldErrors.passwordConfirm}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-crimson hover:bg-crimsond disabled:bg-crimson/70 disabled:cursor-not-allowed text-salt text-sm font-medium py-2.5 transition-colors"
        >
          {isPending ? "가입 처리 중…" : "가입 요청 보내기"}
        </button>
      </form>

      <div className="mt-6 text-sm text-center text-muted">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-crimson font-medium hover:underline">
          로그인
        </Link>
      </div>
    </div>
  );
}

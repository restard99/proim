"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ForgotPasswordState } from "@/app/actions/auth";
import { TEAMS } from "@/lib/auth/constants";

const initialState: ForgotPasswordState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  const fieldErrors = state.status === "error" ? state.fieldErrors : {};

  const borderClass = (hasError: boolean) =>
    hasError
      ? "border-crimson/50 focus:border-crimson focus:ring-crimson/30"
      : "border-mist focus:border-brine focus:ring-brine/30";

  if (state.status === "sent") {
    return (
      <div className="w-full text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-brine/10 flex items-center justify-center">
          <svg className="h-7 w-7 text-brine" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="mt-5 text-xl font-semibold text-inktext">요청을 처리했습니다</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          입력하신 정보로 등록된 이메일이 있다면, 비밀번호 재설정 링크를 보내드렸습니다.
          <br />
          메일함(스팸함 포함)을 확인해주세요.
        </p>
        <p className="mt-4 text-xs text-muted bg-mist/50 rounded px-3 py-2">
          이메일을 등록하지 않았거나 메일이 오지 않는 경우, 관리자에게 문의해 대신 재설정을 요청하세요.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-crimson hover:underline">
          로그인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Link href="/login" className="text-xs text-muted hover:text-inktext mb-6 inline-flex items-center gap-1">
        ← 로그인으로 돌아가기
      </Link>
      <h1 className="text-2xl font-semibold text-inktext">비밀번호 찾기</h1>
      <p className="mt-1.5 text-sm text-muted">
        가입할 때 입력한 이름과 소속팀을 입력하세요. 등록된 이메일로 재설정 링크를 보내드립니다.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
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

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-crimson hover:bg-crimsond disabled:bg-crimson/70 disabled:cursor-not-allowed text-salt text-sm font-medium py-2.5 transition-colors"
        >
          {isPending ? "처리하는 중…" : "비밀번호 리셋"}
        </button>
      </form>
      <p className="mt-4 text-xs text-muted">
        이메일을 등록하지 않았거나 메일이 오지 않는 경우, 관리자에게 문의해 대신 재설정을 요청하세요.
      </p>
    </div>
  );
}

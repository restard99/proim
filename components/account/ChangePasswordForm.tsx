"use client";

import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "@/app/actions/account";

const initialState: ChangePasswordState = { status: "idle" };

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, initialState);

  const fieldErrors = state.status === "error" && state.error === "validation" ? state.fieldErrors : {};
  const isWrongCurrent = state.status === "error" && state.error === "wrong-current-password";
  const isUnknownError = state.status === "error" && state.error === "unknown";

  const borderClass = (hasError: boolean) =>
    hasError
      ? "border-crimson/50 focus:border-crimson focus:ring-crimson/30"
      : "border-mist focus:border-brine focus:ring-brine/30";

  return (
    <form action={formAction} className="space-y-4" key={state.status === "success" ? "reset" : "form"}>
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-inktext mb-1.5">
          현재 비밀번호
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          placeholder="••••••••"
          className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${borderClass(!!fieldErrors.currentPassword || isWrongCurrent)}`}
        />
        {fieldErrors.currentPassword && <p className="mt-1 text-xs text-crimsond">{fieldErrors.currentPassword}</p>}
        {isWrongCurrent && <p className="mt-1 text-xs text-crimsond">현재 비밀번호가 올바르지 않습니다.</p>}
      </div>

      <div className="pt-2 border-t border-mist" />

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-inktext mb-1.5">
          새 비밀번호
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
          새 비밀번호 확인
        </label>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          placeholder="다시 입력하세요"
          className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${borderClass(!!fieldErrors.passwordConfirm)}`}
        />
        {fieldErrors.passwordConfirm && <p className="mt-1 text-xs text-crimsond">{fieldErrors.passwordConfirm}</p>}
      </div>

      {isUnknownError && <p className="text-xs text-crimsond">변경 중 오류가 발생했습니다. 다시 시도해주세요.</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-crimson hover:bg-crimsond disabled:bg-crimson/70 disabled:cursor-not-allowed text-salt text-sm font-medium px-4 py-2.5 transition-colors"
        >
          {isPending ? "변경하는 중…" : "비밀번호 변경"}
        </button>
        {state.status === "success" && <span className="text-xs text-brine">✓ 변경되었습니다</span>}
      </div>
    </form>
  );
}

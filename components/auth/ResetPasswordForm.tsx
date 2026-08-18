"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Phase = "checking" | "ready" | "expired" | "done";

export function ResetPasswordForm() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPhase("ready");
      }
    });

    // 이미 recovery 세션이 만들어진 뒤 컴포넌트가 다시 마운트된 경우(새로고침 등) 대비
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPhase((p) => (p === "checking" ? "ready" : p));
    });

    const timeout = setTimeout(() => {
      setPhase((p) => (p === "checking" ? "expired" : p));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError("비밀번호 변경 중 오류가 발생했습니다. 링크가 만료되었을 수 있습니다.");
      return;
    }
    setPhase("done");
  };

  if (phase === "checking") {
    return (
      <div className="w-full text-center text-sm text-muted">확인하는 중…</div>
    );
  }

  if (phase === "expired") {
    return (
      <div className="w-full text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-crimson/10 flex items-center justify-center">
          <svg className="h-7 w-7 text-crimsond" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 112 0 1 1 0 01-2 0zm1-9a1 1 0 00-1 1v4a1 1 0 002 0V5a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="mt-5 text-xl font-semibold text-inktext">링크가 만료되었습니다</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          재설정 링크는 일정 시간이 지나면 사용할 수 없습니다.
          <br />
          비밀번호 찾기를 다시 시도해주세요.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block w-full rounded-md bg-crimson hover:bg-crimsond text-salt text-sm font-medium py-2.5 transition-colors"
        >
          비밀번호 찾기 다시 하기
        </Link>
      </div>
    );
  }

  if (phase === "done") {
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
        <h1 className="mt-5 text-xl font-semibold text-inktext">비밀번호가 변경되었습니다</h1>
        <p className="mt-2 text-sm text-muted">새 비밀번호로 다시 로그인해주세요.</p>
        <Link
          href="/login"
          className="mt-6 inline-block w-full rounded-md bg-crimson hover:bg-crimsond text-salt text-sm font-medium py-2.5 transition-colors"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  const borderClass = "border-mist focus:border-brine focus:ring-brine/30";

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold text-inktext">새 비밀번호 설정</h1>
      <p className="mt-1.5 text-sm text-muted">메일로 받은 링크를 통해 접속하셨습니다. 새 비밀번호를 입력하세요.</p>

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-md bg-crimson/10 border border-crimson/30 px-3.5 py-3 text-sm text-crimsond">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-inktext mb-1.5">
            새 비밀번호
          </label>
          <input
            id="password"
            type="password"
            placeholder="8자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${borderClass}`}
          />
        </div>
        <div>
          <label htmlFor="passwordConfirm" className="block text-sm font-medium text-inktext mb-1.5">
            새 비밀번호 확인
          </label>
          <input
            id="passwordConfirm"
            type="password"
            placeholder="다시 입력하세요"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${borderClass}`}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-crimson hover:bg-crimsond disabled:bg-crimson/70 disabled:cursor-not-allowed text-salt text-sm font-medium py-2.5 transition-colors"
        >
          {isSubmitting ? "변경하는 중…" : "비밀번호 변경"}
        </button>
      </form>
    </div>
  );
}

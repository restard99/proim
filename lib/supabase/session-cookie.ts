import type { SerializeOptions } from "cookie";

// @supabase/ssr는 세션 쿠키를 쓸 때 내부적으로 만료기간을 400일로 강제한다(cookieOptions로
// maxAge를 넘겨도 무시됨 — 라이브러리 자체 설계). 그래서 브라우저를 완전히 닫아도 로그인이
// 계속 유지되는 문제가 생긴다. 실제로 쿠키를 쓰는 마지막 단계(우리가 구현하는 setAll)에서
// 직접 만료값을 제거해 "브라우저 종료 시 삭제되는" 세션 쿠키로 만든다.
//
// 단, 쿠키를 지우는 요청(로그아웃 등, value가 빈 문자열이고 maxAge:0으로 옴)은 그대로 둬야
// 실제로 삭제가 된다 — 여기서 만료값을 지워버리면 삭제 요청이 세션 쿠키를 새로 심는 꼴이 된다.
export function toSessionCookieOptions(value: string, options: SerializeOptions): SerializeOptions {
  if (value === "") return options;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 의도적으로 골라내 버림
  const { maxAge, expires, ...rest } = options;
  return rest;
}

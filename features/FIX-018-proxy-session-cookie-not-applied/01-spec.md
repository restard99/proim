# FIX-018: 미들웨어(proxy.ts)가 세션 쿠키 설정을 매번 되돌리던 문제

## 문제 상황
FIX-012에서 로그인 쿠키를 "브라우저 종료 시 삭제되는 세션 쿠키"로 만들었는데도, 실제로는 브라우저를 완전히 껐다 켜도 계속 로그인 상태가 유지된다는 신고가 다시 들어왔다.

## 원인
Next.js 미들웨어 역할을 하는 `proxy.ts`가 페이지 이동마다(거의 모든 요청마다) `supabase.auth.getUser()`로 세션을 갱신하는데, 이때 쿠키를 다시 쓰는 부분이 `lib/supabase/server.ts`/`client.ts`가 쓰는 `toSessionCookieOptions()` 헬퍼를 거치지 않고 `@supabase/ssr`이 준 원본 옵션을 그대로 `response.cookies.set()`에 넘기고 있었다. `@supabase/ssr`의 원본 옵션에는 400일짜리 `maxAge`가 그대로 들어있어서, 페이지를 한 번만 이동해도(즉 거의 항상) 쿠키가 다시 400일짜리로 덮어써졌다 — FIX-012가 매 요청마다 무효화되고 있었던 셈이다.

## 기대 동작
`proxy.ts`도 다른 두 클라이언트와 동일하게 `toSessionCookieOptions()`를 거쳐서 쿠키를 설정해, 세션 쿠키 상태가 페이지 이동 후에도 유지되도록 한다.

## 영향 범위
- `proxy.ts`: 쿠키 설정에 `toSessionCookieOptions()` 적용

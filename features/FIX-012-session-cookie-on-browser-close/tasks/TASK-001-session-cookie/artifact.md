# TASK-001: 인증 쿠키를 세션 쿠키로 변경 — 아티팩트

## 상태: 배포 완료

## 수정 내용
`@supabase/ssr`(v0.12.4)는 세션 쿠키를 쓸 때 만료기간을 내부적으로 400일로 강제한다 — `cookieOptions.maxAge`로 넘겨도 무시되는 라이브러리 자체 동작(실제 소스 확인: `setCookieOptions`가 항상 `maxAge: DEFAULT_COOKIE_OPTIONS.maxAge`로 덮어씀). 그래서 앱 쪽 옵션으로는 만료기간을 줄일 수 없어, 실제로 쿠키를 쓰는 마지막 단계(우리가 구현하는 `cookies.setAll`)에서 직접 만료값을 걷어내는 방식으로 해결했다.

로그아웃 등 쿠키를 지우는 요청(value가 빈 문자열, maxAge:0)은 그대로 둬야 실제 삭제가 되므로, 값이 있는 "설정" 요청에서만 만료값을 제거하도록 `toSessionCookieOptions()`로 분기했다.

## 생성/수정된 파일
- `lib/supabase/session-cookie.ts` (신규): `toSessionCookieOptions()` — value가 있으면 maxAge/expires를 제거, 빈 값(삭제 요청)이면 그대로 반환
- `lib/supabase/server.ts`: `setAll`에서 쿠키 옵션을 `toSessionCookieOptions()`로 감싸 저장
- `lib/supabase/client.ts`: 기존엔 `cookies` 옵션을 안 줘서 라이브러리 내부 `document.cookie` 기본 처리에 맡겼는데, 만료값을 직접 걷어내려면 우리가 직접 getAll/setAll을 구현해야 해서 `cookie` 패키지(`parse`/`serialize`)로 동일한 동작을 재현하고 `setAll`에서 같은 헬퍼를 적용
- `package.json`: `cookie`를 직접 의존성으로 추가(그동안 `@supabase/ssr`을 통해 간접적으로만 설치돼 있던 패키지를 직접 import하므로 명시)

## 완료 기준 확인
- [x] 두 클라이언트 모두 값이 있는 쿠키 설정 시 maxAge/expires 제거 (삭제 요청은 그대로 유지)
- [x] 로그아웃 동작 그대로 유지 (삭제 경로는 옵션을 건드리지 않음)
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 모두 통과

## 이슈 및 결정사항
- 브라우저의 "이전 세션 이어서 열기"(계속 브라우징) 설정이 켜져 있으면 일부 브라우저(Chrome 등)는 세션 쿠키도 보존할 수 있다. 이는 브라우저 자체의 동작이라 서버/클라이언트 코드로는 제어할 수 없는 한계다 — 테스트 시 이 옵션이 꺼져 있는 상태(일반적인 기본값)로 확인해야 한다.

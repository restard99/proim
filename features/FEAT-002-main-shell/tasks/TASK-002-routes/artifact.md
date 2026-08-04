# TASK-002: 라우트 연결 및 페이지 생성 — 아티팩트

## 상태: 배포 완료

## 구현 내용
`app/(app)/` route group에 공통 레이아웃과 홈/일정관리/업무일지 3개 준비 중 화면을 연결했다. `AppLayout`이 로그인 사용자의 `profiles`(full_name, team)를 조회해 `AppShell`에 전달하고, 기존 middleware(`proxy.ts`)의 인증/승인 가드는 그대로 유지된다.

## 생성/수정된 파일
- `app/(app)/layout.tsx`: 로그인 사용자 프로필 조회 후 `AppShell`로 감싸는 서버 컴포넌트
- `app/(app)/page.tsx` (`/`): 홈 준비 중 화면
- `app/(app)/schedule/page.tsx` (`/schedule`): 일정관리 준비 중 화면
- `app/(app)/worklog/page.tsx` (`/worklog`): 업무일지 준비 중 화면
- `components/layout/PlaceholderScreen.tsx`: 3개 화면이 공유하는 "준비 중" 빈 상태 컴포넌트 (아이콘 + 제목 + 설명)
- `app/page.tsx` 삭제: Next.js 기본 템플릿 — `app/(app)/page.tsx`로 대체됨

## 완료 기준 확인
- [x] 로그인 후 `/`로 진입하면 사이드바 포함 홈 화면이 보인다 (route group 레이아웃 적용 확인, 실사용자 로그인은 로컬 Supabase 세션 필요해 미검증 — 미들웨어 리다이렉트 동작으로 간접 확인)
- [x] 사이드바에서 일정관리·업무일지 탭 클릭 시 각 라우트로 이동하고 탭 강조가 바뀜 (`usePathname` 기반, TASK-001에서 구현)
- [x] 각 화면은 `02-design.html`과 동일하게 "준비 중입니다" 문구의 빈 상태만 표시
- [x] `/login`, `/signup`, `/pending`, `/admin/approvals`는 사이드바 없이 기존 화면 그대로 유지 (route group 밖에 위치, `npm run build` 라우트 목록으로 확인)
- [x] `npm run build` 통과, `npx eslint` 통과
- [x] 미인증 상태로 `/`, `/schedule`, `/worklog` 요청 시 기존 미들웨어가 `/login`으로 307 리다이렉트하는 것을 dev 서버로 직접 확인

## 이슈 및 결정사항
- 3개 화면의 "준비 중" 빈 상태 마크업이 아이콘 path만 다르고 완전히 동일해 `PlaceholderScreen` 컴포넌트로 추출했다 (spec에는 명시되지 않았던 파일이지만 범위 내 중복 제거).
- 실제 로그인 세션으로 `/` 진입 화면을 브라우저에서 직접 보는 것은 이번 세션에서 테스트 계정이 없어 확인하지 못했다. 6단계 수동 테스트에서 사용자가 직접 로그인 후 확인해야 한다.

# TASK-002: 라우트 연결 및 페이지 생성

## 목적
`AppShell`을 실제 라우트에 연결하고, 홈/일정관리/업무일지 3개 페이지를 준비 중 placeholder로 채운다.

## 작업 범위
- 생성할 파일:
  - `app/(app)/layout.tsx` — 서버 컴포넌트. 로그인 사용자의 `profiles`(full_name, team) 조회 후 `AppShell`에 전달, `{children}` 렌더
  - `app/(app)/page.tsx` → `/` — 홈 준비 중 placeholder
  - `app/(app)/schedule/page.tsx` → `/schedule` — 일정관리 준비 중 placeholder
  - `app/(app)/worklog/page.tsx` → `/worklog` — 업무일지 준비 중 placeholder
- 삭제/교체할 파일: `app/page.tsx` (Next.js 기본 템플릿 — `app/(app)/page.tsx`로 대체되므로 제거)

## 완료 기준
- [ ] 로그인 후 `/`로 진입하면 사이드바 포함 홈 화면이 보인다
- [ ] 사이드바에서 일정관리·업무일지 탭 클릭 시 각 라우트로 이동하고 탭 강조가 바뀐다
- [ ] 각 화면은 `02-design.html`과 동일하게 "준비 중입니다" 문구의 빈 상태만 표시
- [ ] `/login`, `/signup`, `/pending`, `/admin/approvals`는 사이드바 없이 기존 화면 그대로 유지
- [ ] `npm run build` 통과

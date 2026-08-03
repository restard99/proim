# TASK-005: 승인대기 화면 & 접근 가드

## 목적
가입 직후 승인 대기 상태를 안내하고, 세션/승인상태에 따라 전체 앱 접근을 제어한다.

## 작업 범위
- 생성할 파일: `app/pending/page.tsx`, `proxy.ts (Next.js 16 컨벤션, 구 middleware.ts)`
- 참고 파일: `features/FEAT-001-login/02-design.html`의 `view-pending`

## 완료 기준
- [ ] `/pending`은 로그인된 사용자의 이름/소속팀/직급/상태를 보여줌 (design.html 요약 카드 참고)
- [ ] 세션이 없는 사용자가 보호된 라우트에 접근하면 `/login`으로 리다이렉트
- [ ] `profiles.status='pending'`인 사용자가 `/login`, `/signup`, `/pending` 외 경로 접근 시 `/pending`으로 리다이렉트
- [ ] `/admin/**`은 `role='admin'`이 아니면 접근 불가 (다른 경로로 리다이렉트)

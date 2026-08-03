# TASK-004: 로그인 기능

## 목적
이름+소속팀+비밀번호로 로그인하고, 미승인 계정은 차단한다.

## 작업 범위
- 생성할 파일: `app/login/page.tsx`, `components/auth/LoginForm.tsx`
- 수정할 파일: `app/actions/auth.ts` (`signIn` Server Action 추가)
- 참고 파일: `features/FEAT-001-login/02-design.html`의 `view-login`, `view-login-loading`, `view-login-error-cred`, `view-login-error-pending`

## 완료 기준
- [ ] 입력받은 이름+소속팀으로 `profiles`를 조회해 합성 이메일을 찾음
- [ ] 조회 실패 또는 `supabase.auth.signInWithPassword` 실패 시 "이름, 소속팀 또는 비밀번호가 올바르지 않습니다" 오류 표시
- [ ] `profiles.status`가 `pending`/`rejected`면 로그인 직후 세션을 종료하고 "아직 관리자 승인이 완료되지 않았습니다" 오류 표시
- [ ] `status='approved'`면 로그인 성공, `/`로 이동
- [ ] 로딩 중에는 버튼 비활성화 + 스피너 표시 (design.html `view-login-loading` 참고)

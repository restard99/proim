# TASK-003: 비밀번호 찾기 페이지

## 목적
로그인 화면에서 진입해 이름+소속팀만으로 비밀번호 재설정 메일을 요청할 수 있는 `/forgot-password` 페이지를 만든다.

## 작업 범위
- 생성할 파일:
  - `app/forgot-password/page.tsx`
  - `components/auth/ForgotPasswordForm.tsx`
- 수정할 파일:
  - `app/actions/auth.ts`: `requestPasswordReset(prevState, formData)` 액션 추가 — `lookup_auth_email` RPC로 이메일 조회 → 있으면 `resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password` })` 호출. 결과와 무관하게 항상 동일한 성공 상태 반환
  - `components/auth/LoginForm.tsx`: "비밀번호를 잊으셨다면 관리자에게 문의하세요" 문구 제거, 비밀번호 입력란 라벨 옆에 "비밀번호 찾기" 링크(`/forgot-password`) 추가

## 완료 기준
- [ ] 로그인 화면에서 "비밀번호 찾기" 링크로 `/forgot-password` 진입 가능
- [ ] 이름+소속팀 입력 후 "비밀번호 리셋" 버튼을 누르면 항상 동일한 안내 문구("등록된 이메일이 있다면 링크를 보냈습니다")로 전환됨
- [ ] 실제 등록된 계정(이메일 있음)으로 시도하면 Supabase가 재설정 메일을 발송함 (수신 확인)
- [ ] 존재하지 않는 이름+소속팀 조합으로 시도해도 동일한 안내 문구가 뜨고 오류가 노출되지 않음
- [ ] `NEXT_PUBLIC_SITE_URL` 환경변수가 없으면 개발 중 알아채기 쉽게 콘솔 경고

# TASK-001: 회원가입 이메일 필드 전환

## 목적
회원가입 시 가짜 이메일(`@internal.taepyeong.invalid`) 생성을 멈추고, 사용자가 입력한 실제 이메일을 그대로 Supabase 인증 이메일로 사용하도록 바꾼다. 이후 모든 태스크(비밀번호 찾기 등)가 이 위에서 동작한다.

## 작업 범위
- 수정할 파일:
  - `components/auth/SignupForm.tsx`: 이메일 입력란 추가 (비밀번호 입력란 앞, 02-design.html의 강조 박스 스타일 참고)
  - `app/actions/auth.ts`: `SignUpFieldErrors`에 `email` 추가, `signUp`에서 이메일 형식/필수 검증 후 `syntheticEmail` 생성 로직 제거, 입력받은 이메일을 `supabase.auth.signUp({ email, password })`에 사용

## 완료 기준
- [ ] 이메일을 비워두고 제출하면 "이메일을 입력하세요" 검증 오류가 뜬다
- [ ] 형식이 잘못된 값(`@` 없음 등)을 입력하면 형식 오류가 뜬다
- [ ] 정상 가입 시 Supabase 대시보드 Authentication → Users에서 해당 계정의 이메일이 입력한 값과 정확히 일치한다 (가짜 도메인이 아님)
- [ ] 기존 이름+소속팀 로그인 방식은 그대로 동작한다 (이메일은 인증 이메일로만 쓰이고 로그인 입력값은 아님)

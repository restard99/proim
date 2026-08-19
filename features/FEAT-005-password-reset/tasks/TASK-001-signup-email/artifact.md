# TASK-001: 회원가입 이메일 필드 전환 — 아티팩트

## 상태: 배포 완료

## 구현 내용
회원가입 폼에 이메일 입력란을 추가하고, 가짜 이메일(`@internal.taepyeong.invalid`) 생성 로직을 제거해 입력받은 실제 이메일을 그대로 Supabase 인증 이메일로 사용하도록 바꿨다. 중복 이메일 가입 시도 시 별도 오류 메시지도 추가했다.

## 생성/수정된 파일
- `app/actions/auth.ts`: `SignUpFieldErrors`에 `email` 추가, `SignUpState`에 `duplicate-email` 오류 추가, `signUp`에서 이메일 필수/형식 검증 후 synthetic email 생성 제거하고 입력 이메일로 `auth.signUp` 호출, `user_already_exists` 오류 코드 처리
- `components/auth/SignupForm.tsx`: 비밀번호 입력란 앞에 이메일 입력란 추가(강조 박스 스타일), 안내 문구, `duplicate-email` 배너 메시지 추가

## 완료 기준 확인
- [x] 이메일 미입력/형식 오류 시 검증 메시지 표시
- [x] 정상 가입 시 auth.signUp에 입력한 이메일이 그대로 전달됨 (synthetic email 경로 제거)
- [x] 로그인 방식(이름+소속팀)은 변경 없음

## 이슈 및 결정사항
없음

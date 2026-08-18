# TASK-004: 새 비밀번호 설정 페이지 — 아티팩트

## 상태: 완료

## 구현 내용
이메일의 재설정 링크가 도착하는 `/reset-password` 페이지를 만들었다. 클라이언트에서 Supabase의 `onAuthStateChange`로 `PASSWORD_RECOVERY` 이벤트를 감지해 recovery 세션 여부를 확인하고, 새 비밀번호를 `supabase.auth.updateUser()`로 직접 반영한다(recovery 세션은 브라우저에만 있어 서버 액션이 아니라 브라우저 클라이언트로 처리).

## 생성/수정된 파일
- `components/auth/ResetPasswordForm.tsx` (신규): checking/ready/expired/done 4단계 상태
- `app/reset-password/page.tsx` (신규)

## 완료 기준 확인
- [ ] 유효한 링크로 접속 시 폼 노출 — 실제 메일 테스트 필요 (Supabase Redirect URLs 등록 후)
- [ ] 새 비밀번호 변경 성공 흐름 — 실제 메일 테스트 필요
- [ ] 변경한 비밀번호로 재로그인 — 실제 메일 테스트 필요
- [x] recovery 세션 없이 직접 접속 시 4초 뒤 "링크가 만료되었습니다" 표시
- [x] 8자 미만/불일치 시 검증 메시지

## 이슈 및 결정사항
recovery 세션 감지를 위해 최대 4초 대기 후에도 `PASSWORD_RECOVERY` 이벤트나 기존 세션이 없으면 "만료" 상태로 전환한다. 이메일 링크 자체가 유효해도 네트워크가 느리면 오탐할 수 있어, 향후 실제 메일 테스트에서 타이밍 문제가 보이면 대기 시간을 조정할 수 있다.

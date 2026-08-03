# TASK-003: 회원가입 기능

## 목적
이름·소속팀·직급·비밀번호를 입력받아 가입 요청을 생성하고, 관리자 승인 전까지 "대기" 상태로 둔다.

## 작업 범위
- 생성할 파일: `app/signup/page.tsx`, `components/auth/SignupForm.tsx`
- 수정할 파일: `app/actions/auth.ts` (`signUp` Server Action 추가)
- 참고 파일: `features/FEAT-001-login/02-design.html`의 `view-signup`, `view-signup-error`

## 완료 기준
- [ ] 이름/소속팀/직급/비밀번호/비밀번호 확인 필수값 검증 (비밀번호 8자 이상, 두 비밀번호 일치)
- [ ] 서버에서 합성 이메일(`{uuid}@internal.taepyeong.local`) 생성 후 `supabase.auth.signUp` 호출
- [ ] `profiles`에 `full_name`, `team`, `role`, `status='pending'` 저장
- [ ] `(tenant_id, full_name, team)` 중복 시 "이미 등록된 이름입니다" 오류를 화면에 표시 (동명이인이라면 관리자 문의 안내)
- [ ] 가입 성공 시 `/pending`으로 이동
- [ ] 가입 폼에서 `role`은 팀원/팀장/대표 중에서만 선택 가능 (`admin`은 폼에 노출하지 않음)

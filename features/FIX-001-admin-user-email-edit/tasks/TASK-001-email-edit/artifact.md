# TASK-001: 이메일 인라인 수정 기능 — 아티팩트

## 상태: 배포 완료

## 수정 내용
"전체 사용자" 표의 이메일 칸을 클릭하면 입력창으로 바뀌고, 저장하면 서비스 롤 키로 Supabase Auth 이메일을 직접 변경한다.

## 수정된 파일
- `app/actions/admin-users.ts`: `updateUserEmail(profileId, newEmail)` 추가 — 형식 검증, `auth.admin.updateUserById({ email, email_confirm: true })` 호출, 중복 이메일(`email_exists`)은 별도 메시지로 구분
- `components/admin/UserAccountTable.tsx`: `EmailCell` 컴포넌트 추가(클릭 → 인라인 입력 → 저장/취소), 저장 성공 시 `router.refresh()`로 목록 갱신

## 완료 기준 확인
- [x] 이메일 칸 클릭 시 입력창으로 전환
- [ ] 실제 Supabase Auth 이메일 변경 및 새 이메일로 비밀번호 찾기 동작 — 실사용자 테스트 필요
- [x] 잘못된 형식/중복 이메일 시 오류 메시지 표시, 저장 안 됨 (서버 액션에서 검증)
- [x] 관리자가 아닌 계정은 `assertAdmin`으로 거부
- [x] `npx tsc --noEmit` 통과, `/admin/approvals` 컴파일 에러 없이 307(미로그인) 정상 응답

## 이슈 및 결정사항
`email_confirm: true`를 함께 넘겨서 관리자가 직접 지정한 이메일은 별도 확인 메일 없이 바로 확정되도록 했다 — 이 프로젝트는 애초에 가입 확인 이메일 기능을 쓰지 않기로 한 방침(FEAT-005 결정사항)과 일관됨.

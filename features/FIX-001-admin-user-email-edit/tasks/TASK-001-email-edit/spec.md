# TASK-001: 이메일 인라인 수정 기능

## 목적
관리자가 "전체 사용자" 표에서 이메일을 클릭해 바로 수정할 수 있게 한다.

## 작업 범위
- 수정할 파일:
  - `app/actions/admin-users.ts`: `updateUserEmail(profileId, newEmail)` 서버 액션 추가 — 형식 검증 후 `auth.admin.updateUserById(userId, { email })` 호출, 이미 사용 중인 이메일이면 오류 반환
  - `components/admin/UserAccountTable.tsx`: 이메일 칸을 클릭하면 입력창으로 전환 → 저장/취소 버튼

## 완료 기준
- [ ] 이메일 칸 클릭 시 입력창으로 바뀐다
- [ ] 저장하면 실제 Supabase Auth 이메일이 바뀌고, 그 계정으로 새 이메일 기준 비밀번호 찾기가 동작한다
- [ ] 잘못된 형식/중복 이메일 입력 시 오류 메시지가 뜨고 저장되지 않는다
- [ ] 관리자가 아닌 계정은 이 액션을 호출할 수 없다
- [ ] `npx tsc --noEmit` 통과

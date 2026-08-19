# FIX-001: 관리자 화면에서 사용자 이메일 직접 수정

## 문제 상황
`/admin/approvals`의 "전체 사용자" 목록(`UserAccountTable`)은 이메일을 조회만 할 수 있고 수정할 방법이 없다. 특히 가입 시 가짜 이메일(`@internal.taepyeong.invalid`)로 만들어진 기존 계정은 "미등록"으로만 표시되고, 관리자가 나중에 실제 이메일을 채워 넣을 방법이 없어 그 계정은 이메일 기반 비밀번호 찾기(FEAT-005)를 영영 쓸 수 없다.

## 현재 동작
`admin_list_users` RPC로 조회한 이메일이 화면에 텍스트로만 표시된다(등록 안 됐으면 "미등록"). 수정 UI 없음.

## 기대 동작
"전체 사용자" 표의 이메일 칸을 클릭하면 입력창으로 바뀌어 새 이메일을 입력하고 저장할 수 있다. 저장하면 Supabase Auth의 실제 로그인 이메일(`auth.users.email`)이 그 값으로 바뀐다 (서비스 롤 키로 `auth.admin.updateUserById` 사용 — TASK-006에서 이미 구축한 패턴 재사용).

## 영향 범위
- `app/actions/admin-users.ts`: 이메일 변경 서버 액션 추가
- `components/admin/UserAccountTable.tsx`: 이메일 칸을 인라인 편집 가능하게 수정
- 새 DB 마이그레이션 없음 (기존 `admin_list_users`, `auth.users` 그대로 사용)

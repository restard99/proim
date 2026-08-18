# TASK-006: 관리자 대리 비밀번호 재설정

## 목적
이메일이 없거나 메일 수신이 안 되는 사용자를 위해, 관리자가 화면에서 직접 비밀번호를 재설정해줄 수 있게 한다.

## 작업 범위
- 생성할 파일:
  - `lib/supabase/admin.ts`: `SUPABASE_SERVICE_ROLE_KEY`로 서비스 롤 클라이언트를 만드는 서버 전용 헬퍼
  - `app/actions/admin-users.ts`: `listAllUsers()`(admin_list_users RPC 호출), `resetUserPassword(profileId)`(무작위 임시 비밀번호 생성 후 `auth.admin.updateUserById`로 반영, 임시 비밀번호를 응답으로만 반환)
  - `components/admin/UserAccountTable.tsx`: 전체 사용자 목록 + 검색 + "비밀번호 재설정" 버튼 + 결과 모달(임시 비밀번호 표시, 복사 버튼)
- 수정할 파일: `app/admin/approvals/page.tsx` — 기존 가입승인 목록 아래에 "전체 사용자" 섹션 추가

## 완료 기준
- [ ] 관리자 계정으로 `/admin/approvals`에 접속하면 하단에 전체 사용자 목록이 보인다 (이메일 미등록 계정은 "미등록" 표시)
- [ ] 특정 사용자의 "비밀번호 재설정" 버튼을 누르면 임시 비밀번호가 모달에 1회 표시된다
- [ ] 그 임시 비밀번호로 해당 사용자가 실제 로그인이 된다
- [ ] 관리자가 아닌 계정은 이 목록/기능에 접근할 수 없다 (URL 직접 접근 시 홈으로 리다이렉트, 서버 액션도 거부)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트 번들에 노출되지 않는다 (브라우저 네트워크 탭/소스에서 확인)

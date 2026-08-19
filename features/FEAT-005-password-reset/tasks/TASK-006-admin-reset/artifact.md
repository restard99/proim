# TASK-006: 관리자 대리 비밀번호 재설정 — 아티팩트

## 상태: 배포 완료

## 구현 내용
관리자가 `/admin/approvals` 하단 "전체 사용자" 섹션에서 전체 계정을 검색하고, 특정 사용자의 "비밀번호 재설정" 버튼으로 무작위 임시 비밀번호를 즉시 발급할 수 있게 했다. 임시 비밀번호는 모달에 1회만 표시되며 복사 버튼을 제공한다. 서비스 롤 키는 서버 전용 헬퍼(`lib/supabase/admin.ts`)를 통해서만, 그리고 `"use server"` 액션 안에서만 사용된다.

## 생성/수정된 파일
- `lib/supabase/admin.ts` (신규): `server-only` + `SUPABASE_SERVICE_ROLE_KEY`로 서비스 롤 Supabase 클라이언트를 생성하는 헬퍼
- `app/actions/admin-users.ts` (신규): `listAllUsers()`(`admin_list_users` RPC 호출), `resetUserPassword(profileId)`(10자리 무작위 임시 비밀번호 생성 후 `auth.admin.updateUserById`로 반영). 둘 다 호출자 role이 `admin`인지 서버에서 재확인
- `components/admin/UserAccountTable.tsx` (신규): 이름/소속팀 검색, 사용자 테이블, 재설정 결과 모달(복사 버튼 포함)
- `app/admin/approvals/page.tsx`: 기존 가입승인 섹션 아래에 "전체 사용자" 섹션 추가, `listAllUsers()`로 서버에서 목록을 미리 가져와 전달
- `.env.local`: `SUPABASE_SERVICE_ROLE_KEY` 추가

## 완료 기준 확인
- [x] 관리자 계정으로 `/admin/approvals` 접속 시 하단에 전체 사용자 목록 표시 (이메일 미등록 계정은 "미등록" 표시) — `admin_list_users` RPC가 synthetic 도메인 이메일을 NULL로 반환하는 것을 그대로 사용
- [x] "비밀번호 재설정" 버튼 클릭 시 임시 비밀번호가 모달에 1회 표시
- [ ] 그 임시 비밀번호로 실제 로그인 — 실사용자 테스트 필요
- [x] 관리자가 아닌 계정은 접근 불가 — 페이지 레벨(`viewer.role !== "admin"` → `/`로 리다이렉트)과 두 서버 액션 내부(`assertAdmin`) 이중 체크
- [x] `SUPABASE_SERVICE_ROLE_KEY`는 `lib/supabase/admin.ts`에서만 참조되고 이 파일은 `"use server"` 액션(`admin-users.ts`)에서만 import됨 — 클라이언트 컴포넌트(`UserAccountTable.tsx`)는 서버 액션 함수만 import하므로 번들에 키가 포함되지 않음. `npx tsc --noEmit` 통과, `/admin/approvals` 미로그인 접근 시 307 리다이렉트 확인

## 이슈 및 결정사항
- `listAllUsers()`를 클라이언트 컴포넌트에서 직접 호출하지 않고, 서버 컴포넌트인 `page.tsx`에서 먼저 호출해 결과를 props로 내려주는 방식을 택했다 (기존 `ApprovalTable` 패턴과 동일). 초기 로드 시 목록이 바로 채워지고, 재설정 후에는 별도 새로고침 없이 모달로만 결과를 보여주면 충분하다고 판단했다.
- 임시 비밀번호는 서버에서 생성하되 DB에 저장하지 않고 응답으로만 1회 반환한다 — 재확인이 필요하면 관리자가 다시 재설정 버튼을 눌러야 한다 (의도된 동작).

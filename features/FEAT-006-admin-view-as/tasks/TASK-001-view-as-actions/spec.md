# TASK-001: 세션 전환 서버 액션

## 목적
관리자가 대상 계정 세션으로 전환(`startViewAs`)하고, 다시 관리자 세션으로 복원(`stopViewAs`)하는 Server Action을 구현한다.

## 작업 범위
- 생성할 파일: `app/actions/view-as.ts`
- 수정할 파일: 없음 (기존 `lib/supabase/admin.ts`, `lib/supabase/server.ts`, `app/actions/admin-users.ts`의 `listAllUsers`를 그대로 활용)

## 구현 세부

`startViewAs(targetProfileId: string)`:
1. 현재 세션이 admin인지 확인 (`admin-users.ts`의 `assertAdmin` 패턴과 동일하게 구현)
2. `admin_view_as_session` 쿠키가 이미 있으면 실패 반환 — "먼저 관리자로 복귀해주세요"
3. 대상 프로필 조회 — 없거나 `status !== 'approved'` 이거나 `role === 'admin'`이면 실패 반환
4. 서비스 롤 클라이언트로 `auth.admin.getUserById(targetProfileId)`로 대상 이메일 확인
5. `auth.admin.generateLink({ type: 'magiclink', email })` → `properties.hashed_token` 획득
6. 익명 키로 새 클라이언트 생성 후 `auth.verifyOtp({ token_hash, type: 'magiclink' })`로 대상 세션(access/refresh token) 획득
7. 현재(관리자) 세션의 access/refresh token을 `admin_view_as_session` 쿠키(httpOnly, secure, sameSite=lax)에 JSON으로 저장
8. 쿠키 기반 서버 클라이언트로 `auth.setSession(대상 세션)` 호출
9. `redirect('/')`

`stopViewAs()`:
1. `admin_view_as_session` 쿠키가 없으면 그냥 `redirect('/admin/view-as')`
2. 쿠키에서 관리자 원본 세션 파싱 후 `auth.setSession(관리자 세션)` 호출
3. `admin_view_as_session` 쿠키 삭제
4. `redirect('/admin/view-as')`

## 완료 기준
- [ ] `startViewAs`가 admin이 아닌 계정으로 호출되면 실패를 반환한다
- [ ] `startViewAs`가 대상이 admin이거나 미승인 계정이면 실패를 반환한다
- [ ] `startViewAs` 성공 시 로그인 쿠키가 대상 계정 것으로 바뀌고 `/`로 이동한다
- [ ] `stopViewAs` 호출 시 관리자 계정으로 로그인 쿠키가 복원되고 `/admin/view-as`로 이동한다
- [ ] 이미 view-as 중일 때 `startViewAs`를 다시 호출하면 차단된다

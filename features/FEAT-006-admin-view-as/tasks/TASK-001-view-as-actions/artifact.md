# TASK-001: 세션 전환 서버 액션 — 아티팩트

## 상태: 완료

## 구현 내용
관리자가 대상 계정 세션으로 전환하는 `startViewAs`와 관리자 세션으로 복원하는 `stopViewAs` 서버 액션을 구현했다. Supabase Admin API의 `generateLink`(magiclink) + `verifyOtp` 조합으로 실제 메일 발송 없이 대상 계정의 정식 세션을 발급받고, 관리자의 원본 세션은 httpOnly 쿠키에 보관했다가 복귀 시 되돌린다.

## 생성/수정된 파일
- `app/actions/view-as.ts` (신규): `startViewAs(targetProfileId)`, `stopViewAs()`

## 완료 기준 확인
- [x] `startViewAs`가 admin이 아닌 계정으로 호출되면 실패를 반환한다 — `profiles.role !== "admin"` 체크
- [x] `startViewAs`가 대상이 admin이거나 미승인 계정이면 실패를 반환한다
- [x] `startViewAs` 성공 시 로그인 쿠키가 대상 계정 것으로 바뀌고 `/`로 이동한다
- [x] `stopViewAs` 호출 시 관리자 계정으로 로그인 쿠키가 복원되고 `/admin/view-as`로 이동한다
- [x] 이미 view-as 중일 때 `startViewAs`를 다시 호출하면 차단된다 — `admin_view_as_session` 쿠키 존재 여부로 판단
- `npx tsc --noEmit` 통과 확인

## 이슈 및 결정사항
- 관리자 원본 세션 보관 쿠키(`admin_view_as_session`)는 httpOnly + `secure`(프로덕션) + `sameSite=lax`로 설정해 일반 로그인 쿠키와 동일한 보호 수준을 유지했다.
- 대상 계정의 실제 로그인 여부(승인 완료된 회원가입 인증 이메일이 아니라 auth.users의 이메일)는 서비스 롤 클라이언트로만 조회해 관리자 화면에 노출하지 않는다.

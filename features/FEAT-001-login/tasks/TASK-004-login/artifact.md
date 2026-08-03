# TASK-004: 로그인 기능 — 아티팩트

## 상태: 배포 완료

## 구현 내용
이름+소속팀+비밀번호로 로그인하는 `signIn` Server Action과 `/login` 페이지를 구현했다. 이름+소속팀으로 합성 이메일을 조회한 뒤 `signInWithPassword`를 호출하고, 승인되지 않은 계정은 로그인 직후 세션을 종료하고 안내 메시지를 보여준다.

## 생성/수정된 파일
- `app/actions/auth.ts`: `signIn`, `signOut` Server Action 추가
- `components/auth/LoginForm.tsx` (신규): `useActionState` 기반 로그인 폼, 로딩 스피너·자격오류·미승인오류 3가지 배너 상태
- `app/login/page.tsx` (신규): AuthBrandPanel + LoginForm 레이아웃
- `lib/auth/constants.ts`: `ADMIN_TEAM`, `LOGIN_TEAMS` 추가 (아래 이슈 참고)

## 완료 기준 확인
- [x] 이름+소속팀으로 `profiles` 조회(RPC) → 합성 이메일 확인 → `signInWithPassword`
- [x] 자격 불일치 시 오류 메시지 (계정 존재 여부는 노출하지 않음)
- [x] `status`가 `pending`/`rejected`면 로그인 직후 세션 종료 + 안내 메시지
- [x] 로그인 성공 시 `/`로 이동
- [x] 로딩 중 버튼 비활성화 + 스피너 표시

## 이슈 및 결정사항
- 인가 판단에는 `getUser()`를 사용해 서버에서 항상 재검증하도록 했다 (`getSession()` 미사용).
- `signOut` Server Action도 함께 추가했다 (TASK-005/006 페이지에서 재사용 예정).
- **실사용 테스트 중 발견한 버그**: 관리자 계정은 소속팀이 없어 `profiles.team = NULL`로 시딩했는데, 로그인은 이름+소속팀 조합으로 계정을 조회하므로 소속팀을 고를 수 없는 관리자는 로그인 자체가 불가능했다.
  - 1차로 로그인 화면 전용 "관리자" 팀 옵션을 추가하는 방식을 시도했으나, 사용자 요청에 따라 **관리자는 소속팀 선택 없이 이메일+비밀번호로 바로 로그인**하는 방식으로 최종 변경했다.
  - `signIn`에서 "이름" 입력값에 `@`가 포함되어 있으면(`isEmailLike`) 관리자 이메일 직접 로그인으로 간주해 소속팀 검증과 `lookup_auth_email` RPC 조회를 건너뛰고 입력값을 이메일로 바로 사용한다. 일반 직원은 이름에 `@`를 쓸 일이 없으므로 기존 이름+소속팀 조회 경로와 충돌하지 않는다.
  - `lib/supabase/seed.sql`의 관리자 `team`은 다시 `NULL`로 되돌렸다 (더 이상 조회에 쓰이지 않음).
- `tsc --noEmit`, `npm run lint`, `npm run build` 모두 통과.

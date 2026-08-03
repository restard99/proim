# TASK-004: 로그인 기능 — 아티팩트

## 상태: 완료

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
- **실사용 테스트 중 발견한 버그**: 관리자 계정은 소속팀이 없어 `profiles.team = NULL`로 시딩했는데, 로그인은 이름+소속팀 조합으로 계정을 조회하므로 소속팀을 고를 수 없는 관리자는 로그인 자체가 불가능했다. `lib/auth/constants.ts`에 `ADMIN_TEAM='관리자'`, `LOGIN_TEAMS=[...TEAMS, ADMIN_TEAM]`을 추가해 로그인 화면의 소속팀 목록에만 "관리자"를 노출하고(회원가입 화면의 `TEAMS`에는 포함하지 않아 일반 가입자는 선택 불가), `lib/supabase/seed.sql`의 관리자 프로필 `team`도 `NULL` 대신 `'관리자'`로 시딩하도록 수정했다.
- `tsc --noEmit`, `npm run lint`, `npm run build` 모두 통과.

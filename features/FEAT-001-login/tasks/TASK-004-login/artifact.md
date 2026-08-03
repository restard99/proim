# TASK-004: 로그인 기능 — 아티팩트

## 상태: 완료

## 구현 내용
이름+소속팀+비밀번호로 로그인하는 `signIn` Server Action과 `/login` 페이지를 구현했다. 이름+소속팀으로 합성 이메일을 조회한 뒤 `signInWithPassword`를 호출하고, 승인되지 않은 계정은 로그인 직후 세션을 종료하고 안내 메시지를 보여준다.

## 생성/수정된 파일
- `app/actions/auth.ts`: `signIn`, `signOut` Server Action 추가
- `components/auth/LoginForm.tsx` (신규): `useActionState` 기반 로그인 폼, 로딩 스피너·자격오류·미승인오류 3가지 배너 상태
- `app/login/page.tsx` (신규): AuthBrandPanel + LoginForm 레이아웃

## 완료 기준 확인
- [x] 이름+소속팀으로 `profiles` 조회(RPC) → 합성 이메일 확인 → `signInWithPassword`
- [x] 자격 불일치 시 오류 메시지 (계정 존재 여부는 노출하지 않음)
- [x] `status`가 `pending`/`rejected`면 로그인 직후 세션 종료 + 안내 메시지
- [x] 로그인 성공 시 `/`로 이동
- [x] 로딩 중 버튼 비활성화 + 스피너 표시

## 이슈 및 결정사항
- 인가 판단에는 `getUser()`를 사용해 서버에서 항상 재검증하도록 했다 (`getSession()` 미사용).
- `signOut` Server Action도 함께 추가했다 (TASK-005/006 페이지에서 재사용 예정).
- `tsc --noEmit`, `npm run lint`, `npm run build` 모두 통과.

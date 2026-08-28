# FIX-008: 소속팀에 "임원실" 추가

## 문제 상황
회원가입/로그인 화면의 소속팀 선택 목록(`TEAMS`)에 "임원실"이 없어 선택할 수 없음.

## 현재 동작
`lib/auth/constants.ts`의 `TEAMS` 목록에 임원실이 없음 (생산팀/회계팀/환경안전팀/영업팀/영업채산팀/섬들채/증도지원팀/전략기획실/염전관리팀 9개).

## 기대 동작
`TEAMS` 목록에 "임원실"을 추가해 회원가입/로그인/비밀번호 찾기 화면에서 선택 가능해야 한다.

## 영향 범위
- `lib/auth/constants.ts` (수정 대상, 유일한 소스)
- 이를 참조하는 `LoginForm.tsx`, `SignupForm.tsx`, `ForgotPasswordForm.tsx`, `app/actions/auth.ts`는 상수를 그대로 참조하므로 별도 수정 불필요

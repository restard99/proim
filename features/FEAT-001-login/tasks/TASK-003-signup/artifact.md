# TASK-003: 회원가입 기능 — 아티팩트

## 상태: 배포 완료

## 구현 내용
이름·소속팀·직급·비밀번호로 가입 요청을 생성하는 `signUp` Server Action과 `/signup` 페이지를 구현했다. 서버에서 합성 이메일을 생성해 Supabase Auth에 가입시키고, `profiles`에 `status='pending'`으로 저장한다. 이름+소속팀 중복은 가입 전 RPC로 먼저 확인하고, 삽입 시 유니크 제약 위반도 동일한 오류로 처리한다.

## 생성/수정된 파일
- `lib/auth/constants.ts` (신규): TEAMS(8개 팀), SIGNUP_ROLES(팀원/팀장/대표) 공용 상수
- `app/actions/auth.ts` (신규): `signUp` Server Action, `SignUpState` discriminated union
- `components/auth/SignupForm.tsx` (신규): `useActionState` 기반 가입 폼, 필드별 오류·중복 배너 표시
- `app/signup/page.tsx` (신규): AuthBrandPanel + SignupForm 레이아웃

## 완료 기준 확인
- [x] 필수값 검증 (이름/소속팀/직급/비밀번호 8자 이상/비밀번호 확인 일치)
- [x] 합성 이메일(`{uuid}@internal.taepyeong.invalid`) 생성 후 `supabase.auth.signUp` 호출
- [x] `profiles` insert (status=pending)
- [x] 이름+소속팀 중복 시 "이미 등록된 이름입니다" 오류 표시 (사전 RPC 확인 + insert 시 유니크 위반 이중 방어)
- [x] 가입 성공 시 `/pending`으로 이동
- [x] 가입 폼은 팀원/팀장/대표만 선택 가능, `admin`은 서버에서도 허용하지 않음

## 이슈 및 결정사항
- `signUp` 완료 후 `redirect()`는 try/catch 밖에서 호출해 `NEXT_REDIRECT`가 일반 오류로 삼켜지지 않도록 했다.
- `tsc --noEmit`, `npm run lint`, `npm run build` 모두 통과. `/pending` 페이지는 아직 없어 리다이렉트 대상 라우트는 TASK-005에서 생성된다 (그 전까지는 404가 정상).

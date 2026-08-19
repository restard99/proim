# TASK-003: 비밀번호 찾기 페이지 — 아티팩트

## 상태: 배포 완료

## 구현 내용
로그인 화면에서 진입하는 `/forgot-password` 페이지를 만들었다. 이름+소속팀을 입력하면 `lookup_auth_email` RPC로 이메일을 찾아 Supabase의 `resetPasswordForEmail`을 호출하고, 계정 존재 여부와 무관하게 항상 동일한 안내 문구를 보여준다.

## 생성/수정된 파일
- `app/actions/auth.ts`: `ForgotPasswordState`/`ForgotPasswordFieldErrors` 타입, `requestPasswordReset` 액션 추가 (`NEXT_PUBLIC_SITE_URL`을 redirectTo에 사용)
- `components/auth/ForgotPasswordForm.tsx` (신규): 이름+소속팀 폼 + 발송 완료 상태
- `app/forgot-password/page.tsx` (신규)
- `components/auth/LoginForm.tsx`: "비밀번호를 잊으셨다면 관리자에게 문의하세요" 문구 제거, 비밀번호 라벨 옆에 "비밀번호 찾기" 링크 추가
- `.env.local`: `NEXT_PUBLIC_SITE_URL=http://localhost:3000` 추가

## 완료 기준 확인
- [x] 로그인 화면에서 "비밀번호 찾기" 링크로 진입 가능
- [x] 제출 시 항상 동일한 안내 문구로 전환
- [ ] 실제 이메일 수신 확인 — 사용자 테스트 필요
- [x] 존재하지 않는 조합도 동일 문구 (분기 없음)
- [x] `NEXT_PUBLIC_SITE_URL` 없으면 콘솔 경고

## 이슈 및 결정사항
- 관리자 계정(팀 없음)은 이번 화면의 소속팀 선택 항목에 해당이 없어 "비밀번호 찾기"로 커버되지 않는다 — 관리자는 원래대로 Supabase 대시보드에서 직접 재설정한다(기존 방식 유지, 범위 밖).
- **버그**: `proxy.ts`(로그인 미들웨어)가 `/login`, `/signup`만 비로그인 접근 허용 경로로 두고 있어서, 새로 만든 `/forgot-password`가 전부 `/login`으로 리다이렉트되는 문제를 발견했다. `PUBLIC_ROUTES` 목록을 신설해 `/forgot-password`, `/reset-password`를 추가했다. 특히 `/reset-password`는 TASK-004에서 recovery 세션이 막 생성된 상태로 열리는데, 기존 `AUTH_ROUTES`처럼 "로그인 상태면 홈으로 리다이렉트" 규칙에 걸리면 새 비밀번호를 입력하기도 전에 튕겨나가므로, `AUTH_ROUTES`(로그인 시 리다이렉트 대상)와는 분리된 목록으로 설계했다.

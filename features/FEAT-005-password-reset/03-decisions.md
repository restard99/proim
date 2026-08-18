# 비밀번호 찾기/변경 개발 결정사항

## 라우트 구조

| 경로 | 상태 | 설명 |
|---|---|---|
| `/login` | 수정 | `LoginForm`에서 "관리자에게 문의" 문구를 지우고 "비밀번호 찾기" 링크 추가 |
| `/signup` | 수정 | `SignupForm`에 이메일 입력란 추가. `signUp` 액션이 가짜 이메일(`@internal.taepyeong.invalid`) 생성을 멈추고, 입력받은 실제 이메일을 그대로 Supabase 인증 이메일로 사용 |
| `/forgot-password` | 신규 | 이름+소속팀 입력 → "비밀번호 리셋" 버튼 → 등록된 이메일로 재설정 링크 발송 |
| `/reset-password` | 신규 | 이메일의 재설정 링크가 도착하는 곳. 새 비밀번호 2회 입력 후 변경 |
| `/account` | 신규 | 로그인 상태에서 스스로 비밀번호를 바꾸는 "내 정보" 화면 |
| `/admin/approvals` | 수정 | 기존 가입승인 목록 아래에 "전체 사용자" 목록 섹션 추가, 사용자별 "비밀번호 재설정" 버튼 |

## 데이터베이스 스키마

**새 테이블 없음.** `profiles`에 이메일 컬럼도 새로 추가하지 않는다 — 이메일은 `auth.users.email`을 그대로 신뢰 소스(source of truth)로 쓴다 (이유는 결정 근거 참고).

### 신규 RPC: `admin_list_users(p_tenant_id UUID)`
관리자 화면의 "전체 사용자" 목록용. `profiles`와 `auth.users`를 조인해 `id, full_name, team, role, status, email, created_at`을 반환하되, 이메일이 가짜 도메인(`%@internal.taepyeong.invalid`)이면 `email`을 `NULL`로 반환해 "미등록"으로 표시할 수 있게 한다. 함수 내부에서 `public.is_tenant_admin()`으로 호출자가 관리자인지 확인하고, 아니면 빈 결과를 반환한다 (기존 `is_tenant_admin`/`lookup_auth_email` 패턴과 동일한 SECURITY DEFINER 방식).

```sql
CREATE OR REPLACE FUNCTION public.admin_list_users(p_tenant_id UUID)
RETURNS TABLE (id UUID, full_name TEXT, team TEXT, role TEXT, status TEXT, email TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.team, p.role, p.status,
         CASE WHEN au.email LIKE '%@internal.taepyeong.invalid' THEN NULL ELSE au.email END,
         p.created_at
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE p.tenant_id = p_tenant_id AND public.is_tenant_admin(p_tenant_id)
  ORDER BY p.full_name;
$$;
REVOKE ALL ON FUNCTION public.admin_list_users(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users(UUID) TO authenticated;
```

기존 `lookup_auth_email` RPC는 그대로 재사용한다 — 신규 가입자부터는 그 함수가 반환하는 이메일이 곧 실제 이메일이 되므로, "비밀번호 찾기" 화면의 이름+소속팀 → 이메일 조회에 별도 RPC가 필요 없다.

**RLS 변경 없음** — 기존 `profiles_tenant_isolation_select`/`profiles_admin_manage` 정책이 이미 관리자에게 테넌트 내 전체 프로필 조회/관리 권한을 주고 있고, 새 RPC는 그 위에서 SECURITY DEFINER로 안전하게 동작한다.

## 컴포넌트 구조

- `components/auth/SignupForm.tsx` (수정): 이메일 입력란 추가 + 형식 검증
- `components/auth/ForgotPasswordForm.tsx` (신규): 이름+소속팀 입력 폼. 제출 후에는 성공/실패 여부와 무관하게 항상 동일한 안내 문구로 전환
- `components/auth/ResetPasswordForm.tsx` (신규): 새 비밀번호 2회 입력. 유효한 recovery 세션이 없으면(링크 만료 등) 오류 상태 표시
- `components/account/ChangePasswordForm.tsx` (신규): 로그인 상태에서 현재 비밀번호 확인 후 새 비밀번호로 변경
- `components/admin/UserAccountTable.tsx` (신규): 전체 사용자 목록 + 사용자별 "비밀번호 재설정" 버튼 + 결과 모달(발급된 임시 비밀번호 1회 노출)
- `components/layout/AppShell.tsx` (수정): 사이드바 하단 `ProfileFooter`가 지금은 전체가 로그아웃 버튼인데, "내 정보"(`/account`)로 가는 링크와 로그아웃 버튼 두 개로 분리

## 서버 액션

- `app/actions/auth.ts` (수정)
  - `signUp`: `email` 필드 추가(필수, 형식 검증), 가짜 이메일 생성 로직 제거 — 입력받은 이메일을 그대로 `supabase.auth.signUp({ email, password })`에 사용
  - 신규 `requestPasswordReset(prevState, formData)`: 이름+소속팀으로 `lookup_auth_email` RPC 호출 → 이메일을 찾으면 `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/reset-password` })` 호출. 성공/실패/계정 없음 모든 경우에 동일한 결과 메시지 반환 (계정 존재 여부를 외부에 노출하지 않기 위함)
  - 신규 `resetPassword(newPassword)`: `/reset-password` 페이지에서 recovery 세션 상태로 호출, `supabase.auth.updateUser({ password: newPassword })`
- `app/actions/account.ts` (신규): `changePassword(prevState, formData)` — 로그인 세션의 `user.email`로 현재 비밀번호를 `signInWithPassword`로 먼저 검증한 뒤 `auth.updateUser({ password })`
- `app/actions/admin-users.ts` (신규)
  - `listAllUsers()`: `admin_list_users` RPC 호출, 관리자 권한은 함수 내부와 액션 양쪽에서 이중 확인 (`approvals.ts`의 `assertAdmin` 패턴 재사용)
  - `resetUserPassword(profileId)`: 관리자 권한 확인 후, 서비스 롤 클라이언트로 무작위 임시 비밀번호(12자, 영숫자)를 생성해 `supabase.auth.admin.updateUserById(userId, { password })` 호출. 생성된 임시 비밀번호는 DB에 저장하지 않고 응답으로만 1회 반환
- `lib/supabase/admin.ts` (신규): `SUPABASE_SERVICE_ROLE_KEY`로 서비스 롤 Supabase 클라이언트를 만드는 서버 전용 헬퍼. **`"use server"` 액션 파일에서만 import**, 클라이언트 컴포넌트에 절대 노출되지 않도록 격리

## 외부 의존성
새 npm 패키지 없음 — 이미 설치된 `@supabase/supabase-js`가 Admin API(`auth.admin.*`)를 그대로 지원한다.

**신규 환경변수 (`.env.local`, 배포 시 Vercel 환경변수에도 동일하게 등록 필요)**
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 대시보드 → Project Settings → API → `service_role` 비밀 키. 서버 전용, 절대 `NEXT_PUBLIC_` 접두사 붙이지 않음
- `NEXT_PUBLIC_SITE_URL`: 재설정 메일의 링크가 돌아올 주소 (로컬은 `http://localhost:3000`, 배포 도메인은 실제 프로덕션 URL)

## 운영 사전 설정 (코드 밖 — 사용자가 Supabase 대시보드에서 직접)
- Authentication → URL Configuration → Redirect URLs에 `{NEXT_PUBLIC_SITE_URL}/reset-password`를 추가해야 함 — 등록하지 않으면 재설정 링크 자체가 거부됨
- (권장) Authentication → Settings → SMTP에 실제 메일 발송 서비스를 연결 — Supabase 기본 발송은 시간당 발송량 제한이 낮아 팀 규모가 커지면 메일이 지연/누락될 수 있음

## 결정 근거
- **`profiles.email` 컬럼을 새로 만들지 않은 이유**: 이메일을 두 군데(프로필 테이블 + 인증 시스템)에 나눠 저장하면 나중에 값이 어긋날 수 있다. `auth.users.email`을 유일한 원천으로 두고, 기존에 이미 있던 `lookup_auth_email` 패턴을 그대로 확장하는 편이 더 안전하고 일관적이다.
- **관리자 대리 재설정을 이메일 발송이 아니라 화면에 1회 노출하는 임시 비밀번호로 설계한 이유**: 이메일이 등록되지 않은 기존 계정에도 동일하게 동작해야 하고, 실제로 이런 회사 규모에서는 관리자가 사내 메신저 등으로 직접 전달하는 방식이 자연스럽다.
- **"비밀번호 찾기" 결과 메시지를 항상 동일하게 고정한 이유**: 이름+소속팀 조합이 실제 가입 계정인지 여부가 외부에 노출되면 계정 목록을 추측하는 데 악용될 수 있다 (표준 보안 관행).
- **`/reset-password`를 별도 페이지로 새로 만든 이유**: 지금은 이 경로가 없어서, 메일의 재설정 링크를 눌러도 그냥 로그인 화면으로 떨어지는 문제를 실제로 겪었다. 이 페이지가 없으면 이메일 발송 자체가 의미가 없다.

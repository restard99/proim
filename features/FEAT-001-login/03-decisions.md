# 로그인 개발 결정사항

## 라우트 구조

| 경로 | 종류 | 설명 |
|---|---|---|
| `/login` | 페이지 | 로그인 폼 (public) |
| `/signup` | 페이지 | 회원가입 폼 (public) |
| `/pending` | 페이지 | 가입완료 · 승인대기 안내 (public, 가입 직후 진입) |
| `/admin/approvals` | 페이지 | 관리자 승인 목록 (role=admin 전용, middleware 가드) |
| `app/actions/auth.ts` | Server Actions | `signUp`, `signIn`, `signOut` |
| `app/actions/approvals.ts` | Server Actions | `approveUser`, `rejectUser` (role=admin만 실행 가능하도록 서버에서 재검증) |
| `proxy.ts (Next.js 16 컨벤션, 구 middleware.ts)` | 미들웨어 | 세션 확인, `profiles.status` 확인(미승인 시 로그인 차단), `/admin/**` 접근 시 role=admin 확인 |

로그인 성공 시 이동 위치: 역할별 홈 화면은 이번 FEAT 범위가 아니므로, 우선 기존 `app/page.tsx`(루트)로 이동한다. 역할별 대시보드는 이후 FEAT에서 라우팅을 확장한다.

## 데이터베이스 스키마

기존 `lib/supabase/schema.sql`에 이미 `tenants`, `profiles` 뼈대가 있어 이를 이번 기능 요구사항에 맞게 확장한다 (신규 테이블을 만들지 않고 `profiles`를 확장).

```sql
-- 기존 profiles.role 체크 제약을 4개 역할로 확장
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('member', 'leader', 'ceo', 'admin'));
  -- member=팀원, leader=팀장, ceo=대표, admin=시스템 관리자(가입 승인 전담, 공개 가입 폼으로는 생성 불가)

ALTER TABLE profiles
  ADD COLUMN team        TEXT,                              -- 생산팀/회계팀/환경안전팀/영업채산팀/섬들채/증도지원팀/전략기획실/염전관리팀
  ADD COLUMN status       TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN approved_by  UUID REFERENCES auth.users(id),
  ADD COLUMN approved_at  TIMESTAMPTZ;

-- 이름+소속팀을 로그인 식별자로 사용 → 테넌트 내 (이름, 소속팀) 조합 중복 방지
-- 동명이인이어도 소속팀이 다르면 별도 계정으로 가입 가능
ALTER TABLE profiles ADD CONSTRAINT profiles_tenant_name_team_unique UNIQUE (tenant_id, full_name, team);

CREATE INDEX ON profiles(tenant_id, status);
```

RLS 정책 추가:

```sql
-- 관리자는 같은 테넌트의 모든 프로필을 조회/수정 가능 (승인 처리용)
CREATE POLICY "profiles_admin_manage" ON profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin
      WHERE admin.id = auth.uid() AND admin.role = 'admin' AND admin.tenant_id = profiles.tenant_id
    )
  );
```

이름-이메일 처리 방식: Supabase Auth는 이메일 형식을 요구하지만, 로그인 식별자는 "이름 + 소속팀"으로 정했다 (동명이인이어도 소속팀이 다르면 별도 계정 허용). 가입 시 사용자에게 노출되지 않는 합성 이메일(`{uuid}@internal.taepyeong.local`)을 서버에서 생성해 `auth.users`에 등록하고, 실제 이름·소속팀은 `profiles.full_name`, `profiles.team`에 저장한다. 로그인 시에는 입력받은 이름+소속팀으로 `profiles`를 조회해 대응하는 합성 이메일을 찾은 뒤 `signInWithPassword`를 호출한다. 같은 팀 안에서도 동명이인이 겹치는 경우(드문 케이스)는 자동화하지 않고 관리자 문의로 처리한다 (01-spec.md 제외 범위 참고).

관리자 계정: 공개 회원가입 폼에서는 `role`을 팀원/팀장/대표 중에서만 선택할 수 있게 하여 `admin` 역할은 생성되지 않도록 막는다. 관리자 계정은 Supabase 대시보드 또는 시드 스크립트로 개발자가 직접 생성한다.

## 컴포넌트 구조

```
app/
  login/page.tsx              -- 로그인 폼 (이름+소속팀+비밀번호, Client Component, signIn 액션 호출)
  signup/page.tsx              -- 회원가입 폼 (Client Component, signUp 액션 호출)
  pending/page.tsx             -- 승인 대기 안내 (Server Component, 본인 프로필 상태 표시)
  admin/approvals/page.tsx     -- 승인 목록 (Server Component: 목록 조회 + Client Component: 승인/반려 버튼)
  actions/auth.ts              -- signUp / signIn / signOut Server Actions
  actions/approvals.ts         -- approveUser / rejectUser Server Actions
components/
  auth/AuthBrandPanel.tsx      -- 좌측 브랜드 패널(염전 그리드 패턴), 로그인·회원가입·대기 화면 공용
  auth/LoginForm.tsx
  auth/SignupForm.tsx
  admin/ApprovalTable.tsx
proxy.ts (Next.js 16 컨벤션, 구 middleware.ts)                  -- 세션·승인상태·역할 기반 접근 제어
```

02-design.html의 좌측 브랜드 패널(염전 격자 패턴)은 `AuthBrandPanel` 하나로 공용화해 로그인/회원가입/대기 화면에서 재사용한다.

## 외부 의존성

추가 설치 없음. 이미 설치된 `@supabase/ssr`, `@supabase/supabase-js`로 회원가입·로그인·세션·RLS를 모두 처리한다. 폼 검증은 별도 라이브러리 없이 Server Action 내에서 직접 처리한다 (필드 수가 적고 규칙이 단순해 zod 등 도입은 과함).

## 결정 근거

- **이름+소속팀을 로그인 식별자로 쓰되 실제로는 합성 이메일 사용**: 사용자 요구("이름을 아이디로")를 지키면서도 동명이인이 다른 팀이면 가입을 막지 않도록 소속팀을 식별자에 포함했다. Supabase Auth의 이메일 제약은 합성 이메일로 우회하며, 사용자에게는 이메일이 전혀 노출되지 않는다.
- **승인 상태를 `profiles`에 컬럼으로 추가 (별도 테이블 아님)**: 승인 대기/완료가 사용자 1명당 1개 상태만 가지므로 별도 이력 테이블 없이 컬럼으로 충분. 반려 이력 등 감사로그가 필요해지면 이후 FEAT에서 `audit_logs`로 확장한다 (전체 기획서 6절 참고, 이번 범위 아님).
- **관리자 역할을 공개 가입 폼에서 제외**: 관리자가 스스로 가입 요청을 승인하는 상황을 원천 차단하기 위함.
- **기존 스캐폴드(`tenants`/`profiles`)를 확장, 신규 테이블 미생성**: 이미 구성된 SaaS 대비 구조(tenant_id 필수)를 그대로 따르는 것이 CLAUDE.md 핵심 규칙에 부합.

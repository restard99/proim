-- SaaS 전환 대비: 모든 테이블에 tenant_id 필수 적용

-- 테넌트 테이블 (회사 단위)
CREATE TABLE tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 프로필 (auth.users 확장)
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id),
  full_name  TEXT,
  role       TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security 활성화
ALTER TABLE tenants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 테넌트 데이터만 접근 가능
CREATE POLICY "profiles_tenant_isolation" ON profiles
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- RLS 정책: 본인 테넌트만 접근 가능
CREATE POLICY "tenants_tenant_isolation" ON tenants
  USING (
    id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- 인덱스: RLS 정책 성능 최적화
CREATE INDEX ON profiles(tenant_id);

-- ============================================================
-- FEAT-001-login: 회원가입 승인 흐름 + 이름+소속팀 로그인 식별자
-- ============================================================

-- role을 4개 역할로 확장 (member=팀원, leader=팀장, ceo=대표, admin=시스템 관리자)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('member', 'leader', 'ceo', 'admin'));

ALTER TABLE profiles
  ADD COLUMN team        TEXT,
  ADD COLUMN status       TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN approved_by  UUID REFERENCES auth.users(id),
  ADD COLUMN approved_at  TIMESTAMPTZ;

-- 이름+소속팀을 로그인 식별자로 사용 → 테넌트 내 (이름, 소속팀) 조합 중복 방지
-- 동명이인이어도 소속팀이 다르면 별도 계정으로 가입 가능
ALTER TABLE profiles ADD CONSTRAINT profiles_tenant_name_team_unique UNIQUE (tenant_id, full_name, team);

CREATE INDEX ON profiles(tenant_id, status);

-- 기존 profiles_tenant_isolation은 FOR 절이 없어 INSERT/UPDATE에도 적용되는데,
-- 이는 (1) 최초 가입 INSERT가 항상 막히는 버그(본인 프로필이 아직 없어 tenant_id가 NULL)와
-- (2) role/status를 사용자가 스스로 UPDATE해 관리자로 자기 승격할 수 있는 권한 상승 구멍을 만든다.
-- SELECT 전용으로 좁히고, INSERT/관리자 UPDATE는 아래 전용 정책으로 분리한다.
DROP POLICY IF EXISTS "profiles_tenant_isolation" ON profiles;
DROP POLICY IF EXISTS "profiles_tenant_isolation_select" ON profiles;
DROP POLICY IF EXISTS "tenants_tenant_isolation" ON tenants;

-- 본인의 tenant_id 조회용 SECURITY DEFINER 함수.
-- profiles 정책 안에서 profiles를 다시 셀프 서브쿼리로 조회하면 Postgres가
-- 그 서브쿼리에도 같은 정책을 재적용하려다 "infinite recursion detected in
-- policy for relation profiles" 오류를 낼 수 있다 (실사용 중 실제로 로그인 후
-- 상태 조회가 실패해 "승인 대기"로 잘못 표시되는 형태로 나타났다).
-- SECURITY DEFINER 함수는 내부적으로 RLS를 우회해 조회하므로 이 문제가 없다.
CREATE OR REPLACE FUNCTION public.my_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.my_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_tenant_id() TO authenticated;

CREATE POLICY "profiles_tenant_isolation_select" ON profiles
  FOR SELECT
  USING ( tenant_id = public.my_tenant_id() );

CREATE POLICY "tenants_tenant_isolation" ON tenants
  FOR SELECT
  USING ( id = public.my_tenant_id() );

-- 신규 가입자가 자기 자신의 프로필만 생성할 수 있도록 허용 (부트스트랩)
CREATE POLICY "profiles_self_insert" ON profiles
  FOR INSERT
  WITH CHECK ( id = auth.uid() );

-- 관리자 여부 확인용 SECURITY DEFINER 함수.
-- profiles를 자기 자신에 상관 서브쿼리로 재조인하는 정책은 Postgres에서
-- infinite recursion 에러를 일으킬 수 있어, RLS를 우회하는 함수로 감싼다.
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND tenant_id = p_tenant_id
  );
$$;
REVOKE ALL ON FUNCTION public.is_tenant_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID) TO authenticated;

-- 관리자는 같은 테넌트의 모든 프로필을 조회·수정(승인/반려) 가능
CREATE POLICY "profiles_admin_manage" ON profiles
  FOR ALL
  USING ( public.is_tenant_admin(tenant_id) )
  WITH CHECK ( public.is_tenant_admin(tenant_id) );

-- 로그인/가입 화면은 인증 전(anon) 상태에서 이름+소속팀으로 계정을 조회해야 하므로,
-- 위 RLS로는 접근할 수 없다. 필요한 정보만 반환하는 전용 RPC로 최소 권한 노출한다.

-- 이름+소속팀으로 로그인용 합성 이메일만 조회 (status는 반환하지 않음:
-- 비밀번호 검증 이전 요청으로 계정 존재/승인여부를 알아낼 수 없도록 함)
CREATE OR REPLACE FUNCTION public.lookup_auth_email(p_tenant_id UUID, p_full_name TEXT, p_team TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT au.email
  FROM profiles p JOIN auth.users au ON au.id = p.id
  WHERE p.tenant_id = p_tenant_id AND p.full_name = p_full_name AND p.team = p_team
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.lookup_auth_email(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_auth_email(UUID, TEXT, TEXT) TO anon, authenticated;

-- 가입 시 이름+소속팀 중복 여부 사전 확인
CREATE OR REPLACE FUNCTION public.profile_name_team_taken(p_tenant_id UUID, p_full_name TEXT, p_team TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE tenant_id = p_tenant_id AND full_name = p_full_name AND team = p_team
  );
$$;
REVOKE ALL ON FUNCTION public.profile_name_team_taken(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_name_team_taken(UUID, TEXT, TEXT) TO anon, authenticated;

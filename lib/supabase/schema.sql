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

-- ============================================================
-- FEAT-003-sales-department: 일일업무보고 취합/상신 + 연간 매출 목표
-- ============================================================

-- 팀 간 보고 라인. 행이 없는 팀은 사장님에게 직접 보고하는 것으로 간주(기본값).
-- 예외만 행으로 추가한다 (예: 영업채산팀 → 영업팀).
CREATE TABLE team_hierarchy (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  team             TEXT NOT NULL,
  reports_to_team  TEXT,
  UNIQUE (tenant_id, team)
);

-- 팀원 개인 일일업무보고. 영업부는 주간 단위로 취합하므로 하루 1건으로 제한하지 않고
-- 자유롭게 여러 건을 작성할 수 있다 (report_date는 "어느 날짜 업무인지" 표시용일 뿐, 유일키 아님).
CREATE TABLE daily_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  author_id         UUID NOT NULL REFERENCES profiles(id),
  team              TEXT NOT NULL,
  report_date       DATE NOT NULL,
  visited_customers TEXT,
  content           TEXT,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 팀장 종합보고서 (팀원 보고를 취합·재작성한 결과물, 팀원 원본과 별개로 보존)
CREATE TABLE team_daily_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  team          TEXT NOT NULL,
  author_id     UUID NOT NULL REFERENCES profiles(id),
  report_date   DATE NOT NULL,
  content       TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, team, report_date)
);

-- 연간 매출 목표 (Y-ERP에는 목표/quota 데이터가 없어 자체 관리)
CREATE TABLE sales_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  year          INT NOT NULL,
  customer_code TEXT,  -- NULL이면 전체(영업부) 목표
  target_amount NUMERIC NOT NULL,
  UNIQUE (tenant_id, year, customer_code)
);

ALTER TABLE team_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

-- team_hierarchy: 같은 테넌트는 조회만, 쓰기는 관리자만
CREATE POLICY "team_hierarchy_tenant_select" ON team_hierarchy
  FOR SELECT USING ( tenant_id = public.my_tenant_id() );
CREATE POLICY "team_hierarchy_admin_write" ON team_hierarchy
  FOR ALL USING ( public.is_tenant_admin(tenant_id) ) WITH CHECK ( public.is_tenant_admin(tenant_id) );

-- daily_reports: 본인 글은 본인이 쓰고, 본인 또는 소속팀 팀장/관리자가 조회
CREATE POLICY "daily_reports_self_select" ON daily_reports
  FOR SELECT USING ( author_id = auth.uid() );
CREATE POLICY "daily_reports_leader_select" ON daily_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.tenant_id = daily_reports.tenant_id
        AND p.team = daily_reports.team
        AND p.role IN ('leader', 'admin')
    )
  );
CREATE POLICY "daily_reports_self_insert" ON daily_reports
  FOR INSERT WITH CHECK ( author_id = auth.uid() AND tenant_id = public.my_tenant_id() );
CREATE POLICY "daily_reports_self_update" ON daily_reports
  FOR UPDATE USING ( author_id = auth.uid() ) WITH CHECK ( author_id = auth.uid() );

-- team_daily_reports: 작성한 팀장 본인 + 상위 보고 대상 팀장(team_hierarchy 기준)만 조회
CREATE POLICY "team_daily_reports_self_select" ON team_daily_reports
  FOR SELECT USING ( author_id = auth.uid() );
CREATE POLICY "team_daily_reports_upstream_select" ON team_daily_reports
  FOR SELECT USING (
    status = 'submitted'
    AND EXISTS (
      SELECT 1 FROM team_hierarchy th
      JOIN profiles p ON p.id = auth.uid()
      WHERE th.tenant_id = team_daily_reports.tenant_id
        AND th.team = team_daily_reports.team
        AND th.reports_to_team = p.team
        AND p.role IN ('leader', 'admin')
    )
  );
CREATE POLICY "team_daily_reports_self_insert" ON team_daily_reports
  FOR INSERT WITH CHECK ( author_id = auth.uid() AND tenant_id = public.my_tenant_id() );
CREATE POLICY "team_daily_reports_self_update" ON team_daily_reports
  FOR UPDATE USING ( author_id = auth.uid() ) WITH CHECK ( author_id = auth.uid() );

-- sales_targets: 같은 테넌트는 조회만, 쓰기는 관리자만
CREATE POLICY "sales_targets_tenant_select" ON sales_targets
  FOR SELECT USING ( tenant_id = public.my_tenant_id() );
CREATE POLICY "sales_targets_admin_write" ON sales_targets
  FOR ALL USING ( public.is_tenant_admin(tenant_id) ) WITH CHECK ( public.is_tenant_admin(tenant_id) );

CREATE INDEX ON daily_reports(tenant_id, team, report_date);
CREATE INDEX ON team_daily_reports(tenant_id, team, report_date);

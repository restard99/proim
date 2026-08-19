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
DROP POLICY IF EXISTS "daily_reports_self_delete" ON daily_reports;
CREATE POLICY "daily_reports_self_delete" ON daily_reports
  FOR DELETE USING ( author_id = auth.uid() );

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
DROP POLICY IF EXISTS "team_daily_reports_self_delete" ON team_daily_reports;
CREATE POLICY "team_daily_reports_self_delete" ON team_daily_reports
  FOR DELETE USING ( author_id = auth.uid() );

-- sales_targets: 같은 테넌트는 조회만, 쓰기는 관리자만
CREATE POLICY "sales_targets_tenant_select" ON sales_targets
  FOR SELECT USING ( tenant_id = public.my_tenant_id() );
CREATE POLICY "sales_targets_admin_write" ON sales_targets
  FOR ALL USING ( public.is_tenant_admin(tenant_id) ) WITH CHECK ( public.is_tenant_admin(tenant_id) );

CREATE INDEX ON daily_reports(tenant_id, team, report_date);
CREATE INDEX ON team_daily_reports(tenant_id, team, report_date);

-- ============================================================
-- FEAT-003-sales-department: 업무일지 첨부파일 (여러 개 첨부 가능)
-- ============================================================

-- 먼저 시도했던 단일 컬럼 방식(attachment_path/attachment_name)은 파일 1개만
-- 붙일 수 있어서 별도 테이블로 교체한다. 이미 실행했다면 아래에서 정리된다.
ALTER TABLE daily_reports
  DROP COLUMN IF EXISTS attachment_path,
  DROP COLUMN IF EXISTS attachment_name;

CREATE TABLE IF NOT EXISTS daily_report_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  report_id   UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  path        TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE daily_report_attachments ENABLE ROW LEVEL SECURITY;

-- 본인 업무일지에 딸린 첨부파일은 본인이 전부(조회/추가/삭제) 관리
DROP POLICY IF EXISTS "daily_report_attachments_self_all" ON daily_report_attachments;
CREATE POLICY "daily_report_attachments_self_all" ON daily_report_attachments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM daily_reports d WHERE d.id = report_id AND d.author_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM daily_reports d WHERE d.id = report_id AND d.author_id = auth.uid())
  );

-- 소속팀 팀장/관리자는 팀원 업무일지의 첨부파일 목록을 조회 가능 (daily_reports_leader_select와 동일 조건)
DROP POLICY IF EXISTS "daily_report_attachments_leader_select" ON daily_report_attachments;
CREATE POLICY "daily_report_attachments_leader_select" ON daily_report_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_reports d
      JOIN profiles p ON p.id = auth.uid()
      WHERE d.id = report_id AND p.tenant_id = d.tenant_id AND p.team = d.team AND p.role IN ('leader', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS daily_report_attachments_report_id_idx ON daily_report_attachments(report_id);

-- 비공개 버킷: 본인 폴더(auth.uid())에만 업로드/삭제 가능, 로그인한 누구나 조회 가능
-- (실제 접근 가능 여부는 daily_report_attachments 테이블 RLS로 걸러지고,
--  파일 경로 자체도 추측 불가능한 값이라 스토리지 조회 정책은 인증 여부만 확인해도 충분하다)
INSERT INTO storage.buckets (id, name, public)
VALUES ('worklog-attachments', 'worklog-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "worklog_attachments_insert_own" ON storage.objects;
CREATE POLICY "worklog_attachments_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'worklog-attachments' AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS "worklog_attachments_select_authenticated" ON storage.objects;
CREATE POLICY "worklog_attachments_select_authenticated" ON storage.objects
  FOR SELECT USING ( bucket_id = 'worklog-attachments' AND auth.role() = 'authenticated' );
DROP POLICY IF EXISTS "worklog_attachments_delete_own" ON storage.objects;
CREATE POLICY "worklog_attachments_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'worklog-attachments' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- FEAT-003-sales-department: 생산의뢰서 (영업채산팀장이 매일 업로드하는 엑셀을 파싱해 보관)
-- ============================================================

CREATE TABLE IF NOT EXISTS production_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  team          TEXT NOT NULL,
  request_date  DATE NOT NULL,
  file_path     TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  items         JSONB NOT NULL,
  sub_items     JSONB NOT NULL DEFAULT '[]'::jsonb,
  totals        JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE production_requests ENABLE ROW LEVEL SECURITY;

-- 같은 테넌트의 영업채산팀(팀원 포함) + 생산팀(팀원 포함, FEAT-004에서 읽기 전용 조회
-- 권한 추가) + 관리자는 조회 가능
DROP POLICY IF EXISTS "production_requests_team_select" ON production_requests;
CREATE POLICY "production_requests_team_select" ON production_requests
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team IN ('영업채산팀', '생산팀'))
    )
  );

-- 업로드는 영업채산팀장(또는 관리자)만
DROP POLICY IF EXISTS "production_requests_leader_insert" ON production_requests;
CREATE POLICY "production_requests_leader_insert" ON production_requests
  FOR INSERT WITH CHECK (
    tenant_id = public.my_tenant_id()
    AND uploaded_by = auth.uid()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '영업채산팀' AND p.role = 'leader')
    )
  );

-- 수정(엑셀 파싱 결과 보정)과 삭제는 영업채산팀장 또는 관리자만
DROP POLICY IF EXISTS "production_requests_uploader_delete" ON production_requests;
DROP POLICY IF EXISTS "production_requests_leader_delete" ON production_requests;
CREATE POLICY "production_requests_leader_delete" ON production_requests
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '영업채산팀' AND p.role = 'leader')
  );

DROP POLICY IF EXISTS "production_requests_leader_update" ON production_requests;
CREATE POLICY "production_requests_leader_update" ON production_requests
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '영업채산팀' AND p.role = 'leader')
    )
  ) WITH CHECK (
    tenant_id = public.my_tenant_id()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '영업채산팀' AND p.role = 'leader')
    )
  );

CREATE INDEX IF NOT EXISTS production_requests_tenant_date_idx ON production_requests(tenant_id, request_date DESC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('production-requests', 'production-requests', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "production_requests_insert_own" ON storage.objects;
CREATE POLICY "production_requests_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'production-requests' AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS "production_requests_select_authenticated" ON storage.objects;
CREATE POLICY "production_requests_select_authenticated" ON storage.objects
  FOR SELECT USING ( bucket_id = 'production-requests' AND auth.role() = 'authenticated' );
DROP POLICY IF EXISTS "production_requests_delete_own" ON storage.objects;
CREATE POLICY "production_requests_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'production-requests' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- FEAT-003-sales-department: 종합보고서에 팀원 업무일지 첨부파일을 그대로 연결
-- ============================================================

-- 새 파일을 업로드하는 게 아니라, 팀원이 이미 올려둔 첨부파일(worklog-attachments의
-- 동일 경로)을 종합보고서에서도 참조할 수 있도록 연결만 저장한다.
CREATE TABLE IF NOT EXISTS team_daily_report_attachments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  team_report_id UUID NOT NULL REFERENCES team_daily_reports(id) ON DELETE CASCADE,
  path           TEXT NOT NULL,
  name           TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE team_daily_report_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_daily_report_attachments_self_all" ON team_daily_report_attachments;
CREATE POLICY "team_daily_report_attachments_self_all" ON team_daily_report_attachments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM team_daily_reports t WHERE t.id = team_report_id AND t.author_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM team_daily_reports t WHERE t.id = team_report_id AND t.author_id = auth.uid())
  );

DROP POLICY IF EXISTS "team_daily_report_attachments_upstream_select" ON team_daily_report_attachments;
CREATE POLICY "team_daily_report_attachments_upstream_select" ON team_daily_report_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_daily_reports t
      JOIN team_hierarchy th ON th.tenant_id = t.tenant_id AND th.team = t.team
      JOIN profiles p ON p.id = auth.uid()
      WHERE t.id = team_report_id
        AND t.status = 'submitted'
        AND th.reports_to_team = p.team
        AND p.role IN ('leader', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS team_daily_report_attachments_report_id_idx
  ON team_daily_report_attachments(team_report_id);

-- ============================================================
-- FEAT-004-production-team: 생산일지 (생산팀이 매월 올리는 공정별 실적 엑셀을 그대로 보관)
-- ============================================================

CREATE TABLE IF NOT EXISTS production_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  team          TEXT NOT NULL,
  period_label  TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  sheets        JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

-- 같은 테넌트의 생산팀(팀원+팀장) + 관리자는 조회 가능
DROP POLICY IF EXISTS "production_logs_team_select" ON production_logs;
CREATE POLICY "production_logs_team_select" ON production_logs
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '생산팀')
    )
  );

-- 업로드는 생산팀 소속이면 팀원/팀장 구분 없이 누구나 + 관리자
DROP POLICY IF EXISTS "production_logs_team_insert" ON production_logs;
CREATE POLICY "production_logs_team_insert" ON production_logs
  FOR INSERT WITH CHECK (
    tenant_id = public.my_tenant_id()
    AND uploaded_by = auth.uid()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '생산팀')
    )
  );

-- 삭제는 본인이 올린 것 또는 관리자만 (수정 기능은 없음 — UPDATE 정책 없음)
DROP POLICY IF EXISTS "production_logs_self_delete" ON production_logs;
CREATE POLICY "production_logs_self_delete" ON production_logs
  FOR DELETE USING (
    uploaded_by = auth.uid() OR public.is_tenant_admin(tenant_id)
  );

CREATE INDEX IF NOT EXISTS production_logs_tenant_period_idx ON production_logs(tenant_id, period_label DESC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('production-logs', 'production-logs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "production_logs_insert_own" ON storage.objects;
CREATE POLICY "production_logs_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'production-logs' AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS "production_logs_select_authenticated" ON storage.objects;
CREATE POLICY "production_logs_select_authenticated" ON storage.objects
  FOR SELECT USING ( bucket_id = 'production-logs' AND auth.role() = 'authenticated' );
DROP POLICY IF EXISTS "production_logs_delete_own" ON storage.objects;
CREATE POLICY "production_logs_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'production-logs' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- FEAT-005-password-reset: 관리자 화면의 "전체 사용자" 목록용 RPC
-- ============================================================

-- 관리자가 테넌트 내 전체 사용자(이메일 포함)를 조회할 때 쓴다.
-- 가짜 이메일(@internal.taepyeong.invalid)로 가입한 기존 계정은 email을 NULL로 반환해
-- 화면에서 "미등록"으로 표시할 수 있게 한다. 관리자가 아니면 빈 결과를 반환한다.
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

-- ============================================================
-- FEAT-007-saltfield-team: 염전관리팀 생산량 / 부자재재고현황
-- ============================================================

-- 날짜별로 누적되는 생산량 레코드. 같은 날짜를 포함한 파일을 다시 올리면
-- (tenant_id, record_date) 충돌로 그 날짜만 갱신된다 (정정 업로드 대응).
CREATE TABLE IF NOT EXISTS saltfield_production_records (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  record_date               DATE NOT NULL,
  daily_total               INTEGER NOT NULL DEFAULT 0,
  field_data                JSONB NOT NULL,
  weekly_plan               INTEGER,
  weekly_actual             INTEGER,
  plan_ratio                NUMERIC,
  monthly_plan              INTEGER,
  monthly_actual            INTEGER,
  monthly_achievement_rate  NUMERIC,
  monthly_cum_plan          INTEGER,
  monthly_cum_actual        INTEGER,
  monthly_cum_rate          NUMERIC,
  annual_plan               INTEGER,
  annual_actual             INTEGER,
  annual_progress_rate      NUMERIC,
  uploaded_by               UUID NOT NULL REFERENCES profiles(id),
  file_name                 TEXT NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, record_date)
);
ALTER TABLE saltfield_production_records ENABLE ROW LEVEL SECURITY;

-- 조회는 염전관리팀 전체(팀원+팀장) + 관리자
DROP POLICY IF EXISTS "saltfield_production_team_select" ON saltfield_production_records;
CREATE POLICY "saltfield_production_team_select" ON saltfield_production_records
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '염전관리팀')
    )
  );

-- 업로드는 팀장 제한 없이 염전관리팀 전체 + 관리자 (기존 생산의뢰서와 다른 점)
DROP POLICY IF EXISTS "saltfield_production_team_insert" ON saltfield_production_records;
CREATE POLICY "saltfield_production_team_insert" ON saltfield_production_records
  FOR INSERT WITH CHECK (
    tenant_id = public.my_tenant_id()
    AND uploaded_by = auth.uid()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '염전관리팀')
    )
  );

-- 같은 날짜 재업로드 시 갱신 가능 (UPDATE 정책도 동일 조건)
DROP POLICY IF EXISTS "saltfield_production_team_update" ON saltfield_production_records;
CREATE POLICY "saltfield_production_team_update" ON saltfield_production_records
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '염전관리팀')
    )
  ) WITH CHECK (
    tenant_id = public.my_tenant_id()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '염전관리팀')
    )
  );

CREATE INDEX IF NOT EXISTS saltfield_production_tenant_date_idx ON saltfield_production_records(tenant_id, record_date DESC);

-- 부자재재고현황. "최신 파일로 교체" 방식이라 업로드 시 기존 테넌트 행을
-- 전부 지우고 새로 삽입한다 (서버 액션에서 트랜잭션으로 처리).
CREATE TABLE IF NOT EXISTS saltfield_materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  month_label   TEXT NOT NULL,
  vendor_name   TEXT NOT NULL,
  item_name     TEXT NOT NULL,
  unit_price    NUMERIC,
  carryover_qty NUMERIC,
  inbound_qty   NUMERIC,
  outbound_qty  NUMERIC,
  stock_qty     NUMERIC,
  stock_value   NUMERIC,
  note          TEXT,
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE saltfield_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saltfield_materials_team_select" ON saltfield_materials;
CREATE POLICY "saltfield_materials_team_select" ON saltfield_materials
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '염전관리팀')
    )
  );

DROP POLICY IF EXISTS "saltfield_materials_team_insert" ON saltfield_materials;
CREATE POLICY "saltfield_materials_team_insert" ON saltfield_materials
  FOR INSERT WITH CHECK (
    tenant_id = public.my_tenant_id()
    AND uploaded_by = auth.uid()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '염전관리팀')
    )
  );

-- "전체 교체" 업로드 시 기존 행 삭제를 위한 정책
DROP POLICY IF EXISTS "saltfield_materials_team_delete" ON saltfield_materials;
CREATE POLICY "saltfield_materials_team_delete" ON saltfield_materials
  FOR DELETE USING (
    tenant_id = public.my_tenant_id()
    AND (
      public.is_tenant_admin(tenant_id)
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.team = '염전관리팀')
    )
  );

CREATE INDEX IF NOT EXISTS saltfield_materials_tenant_month_idx ON saltfield_materials(tenant_id, month_label);

-- ============================================================
-- FIX-003: 로그인 화면 이름 입력 시 소속팀 자동 매칭
-- ============================================================

-- 이름으로 소속팀 목록만 반환한다(동명이인이면 여러 개). 승인 상태는 반환하지 않아
-- 미승인 계정 존재 여부가 노출되지 않도록 한다 (기존 lookup_auth_email과 동일한 보안 원칙).
CREATE OR REPLACE FUNCTION public.lookup_teams_by_name(p_tenant_id UUID, p_full_name TEXT)
RETURNS TEXT[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(team), ARRAY[]::TEXT[])
  FROM profiles
  WHERE tenant_id = p_tenant_id AND full_name = p_full_name;
$$;
REVOKE ALL ON FUNCTION public.lookup_teams_by_name(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_teams_by_name(UUID, TEXT) TO anon, authenticated;

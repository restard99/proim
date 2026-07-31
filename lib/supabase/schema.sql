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

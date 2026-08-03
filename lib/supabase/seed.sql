-- FEAT-001-login: 기본 테넌트 + 관리자 계정 시드
-- schema.sql 적용 후, 아래 수동 선행 작업을 마친 뒤 실행한다.
--
-- 수동 선행 작업 (코드로 자동화 불가):
-- 1. Supabase 대시보드 → Authentication → Providers → Email → "Confirm email" 비활성화
--    (합성 이메일은 실제 수신이 불가능해서, 이메일 확인이 켜져 있으면 회원가입이 막힌다)
-- 2. Supabase 대시보드 → Authentication → Users → Add user 로 관리자 계정을 직접 생성
--    (이메일 예: admin@internal.taepyeong.invalid, 비밀번호는 대시보드에서 직접 지정)
-- 3. 생성된 user id를 복사해 아래 <PASTE-ADMIN-AUTH-USER-ID> 두 곳에 채운 뒤 이 파일을 실행

-- 고정 UUID로 시딩: 앱 코드에서는 이 값을 DEFAULT_TENANT_ID 환경변수로 참조하고
-- 매 요청마다 RLS로 보호된 tenants 테이블을 조회하지 않는다.
INSERT INTO tenants (id, name)
VALUES ('a0000000-0000-4000-8000-000000000001', '태평염전')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, tenant_id, full_name, team, role, status, approved_by, approved_at)
VALUES (
  '<PASTE-ADMIN-AUTH-USER-ID>',
  'a0000000-0000-4000-8000-000000000001',
  '시스템 관리자',
  NULL,
  'admin',
  'approved',
  '<PASTE-ADMIN-AUTH-USER-ID>',
  now()
)
ON CONFLICT (id) DO NOTHING;

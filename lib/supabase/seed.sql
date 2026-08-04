-- FEAT-001-login: 기본 테넌트 + 관리자 계정 시드
-- schema.sql 적용 후, 아래 수동 선행 작업을 마친 뒤 실행한다.
--
-- 수동 선행 작업 (코드로 자동화 불가):
-- 1. Supabase 대시보드 → Authentication → Providers → Email → "Confirm email" 비활성화
--    (합성 이메일은 실제 수신이 불가능해서, 이메일 확인이 켜져 있으면 회원가입이 막힌다)
-- 2. Supabase 대시보드 → Authentication → Users → Add user 로 관리자 계정을 직접 생성
--    (이메일: restard@sumdleche.kr — 로그인 화면의 "이름" 칸에 이 이메일을 그대로 입력하게 됨.
--     비밀번호도 대시보드에서 직접 지정)
-- 3. 생성된 user id를 복사해 아래 두 곳(id, approved_by)에 채운 뒤 이 파일을 실행
--    (현재 채워진 값 d7b2ac72-4ce6-4514-bfb0-8e0fde1d2176 이 restard@sumdleche.kr 계정의 UID가 맞는지
--     Authentication → Users에서 다시 한번 확인할 것)
-- 참고: 관리자는 소속팀이 없어(team=NULL) 로그인 화면에서 "이름" 칸에 위 이메일을,
--       소속팀은 선택하지 않고 비밀번호만 입력하면 로그인된다 (app/actions/auth.ts의 signIn 참고)

-- 고정 UUID로 시딩: 앱 코드에서는 이 값을 DEFAULT_TENANT_ID 환경변수로 참조하고
-- 매 요청마다 RLS로 보호된 tenants 테이블을 조회하지 않는다.
INSERT INTO tenants (id, name)
VALUES ('a0000000-0000-4000-8000-000000000001', '태평염전')
ON CONFLICT (id) DO NOTHING;

-- ON CONFLICT ... DO UPDATE: 이전에 잘못된 값으로 실행한 적이 있어도
-- 다시 실행하면 항상 아래 값으로 정정된다 (DO NOTHING이면 잘못된 기존 행이 안 고쳐짐).
INSERT INTO profiles (id, tenant_id, full_name, team, role, status, approved_by, approved_at)
VALUES (
  'd7b2ac72-4ce6-4514-bfb0-8e0fde1d2176',
  'a0000000-0000-4000-8000-000000000001',
  '시스템 관리자',
  NULL,
  'admin',
  'approved',
  'd7b2ac72-4ce6-4514-bfb0-8e0fde1d2176',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  full_name = EXCLUDED.full_name,
  team = EXCLUDED.team,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  approved_by = EXCLUDED.approved_by,
  approved_at = EXCLUDED.approved_at;

-- ============================================================
-- FEAT-003-sales-department: 보고 라인 예외 시드
-- 영업채산팀은 사장님이 아닌 영업팀장에게 업무보고가 올라간다.
-- 행이 없는 다른 팀은 전부 사장님에게 직접 보고(기본값)로 간주된다.
-- ============================================================
INSERT INTO team_hierarchy (tenant_id, team, reports_to_team)
VALUES ('a0000000-0000-4000-8000-000000000001', '영업채산팀', '영업팀')
ON CONFLICT (tenant_id, team) DO UPDATE SET
  reports_to_team = EXCLUDED.reports_to_team;

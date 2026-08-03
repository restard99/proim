# TASK-001: DB 스키마 확장 — 아티팩트

## 상태: 완료

## 구현 내용
`profiles` 테이블에 회원가입 승인 흐름에 필요한 컬럼(team/status/approved_by/approved_at)과 이름+소속팀 유니크 제약을 추가했다. 기존 `profiles_tenant_isolation` 정책을 SELECT 전용으로 좁히고, 부트스트랩용 INSERT 정책과 SECURITY DEFINER 기반 관리자 정책을 신설했으며, 로그인/가입 화면이 인증 전(anon) 상태에서 계정을 조회할 수 있도록 전용 RPC 2개를 추가했다.

## 생성/수정된 파일
- `lib/supabase/schema.sql`: role 4종 확장, team/status/approved_by/approved_at 컬럼, 유니크 제약, RLS 정책 재설계, `is_tenant_admin`/`lookup_auth_email`/`profile_name_team_taken` 함수 추가
- `lib/supabase/seed.sql` (신규): 기본 테넌트(고정 UUID) + 관리자 프로필 시드, 수동 선행 작업 안내 포함
- `.env.local.example`: `DEFAULT_TENANT_ID` 추가

## 완료 기준 확인
- [x] `profiles`에 team/status/approved_by/approved_at 컬럼 추가
- [x] role 체크가 member/leader/ceo/admin 4종 허용
- [x] `(tenant_id, full_name, team)` 유니크 제약 존재
- [x] 관리자가 전체 프로필 조회/수정 가능한 RLS 정책 존재
- [x] 기본 tenant row 시드 SQL 작성 (실제 DB 적용은 사용자가 Supabase 프로젝트에서 수동 실행 필요)

## 이슈 및 결정사항
- 계획 단계에서 기존 `profiles_tenant_isolation` 정책에 실제 버그 2건을 발견해 함께 수정했다: (1) `FOR` 절이 없어 INSERT에도 적용되는데 최초 가입 시 본인 프로필이 없어 매번 막히는 부트스트랩 버그, (2) 같은 이유로 사용자가 자기 role/status를 직접 UPDATE해 관리자로 자가 승격할 수 있는 권한 상승 구멍. `profiles_self_insert`(INSERT 전용) + `profiles_admin_manage`(관리자 전용 ALL)로 분리해 해결했다.
- 관리자 판별 정책은 `profiles`를 상관 서브쿼리로 자기 자신에 재조인하면 Postgres에서 무한 재귀 오류가 날 수 있어, `is_tenant_admin()` SECURITY DEFINER 함수로 감쌌다.
- 로그인 시 이름+소속팀으로 합성 이메일을 조회해야 하는데 RLS로는 인증 전 접근이 불가능해 `lookup_auth_email` RPC를 추가했다. 이 함수는 이메일만 반환하고 `status`는 반환하지 않는다 — 승인 여부는 비밀번호 검증 이후에만 확인해 계정 존재/승인상태가 사전에 노출되지 않도록 했다.
- 합성 이메일 도메인은 `.local`(mDNS 예약) 대신 `.invalid`(RFC 2606, 실제 발급 불가 보장)를 사용하기로 결정 — TASK-003에서 반영.
- 실제 DB 반영은 이 세션에서 실행하지 않았다. 사용자가 Supabase 프로젝트의 SQL 에디터에서 `schema.sql`을 적용하고, 대시보드에서 이메일 확인 비활성화 + 관리자 계정 생성 후 `seed.sql`을 실행해야 한다.

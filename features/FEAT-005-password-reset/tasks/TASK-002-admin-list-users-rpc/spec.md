# TASK-002: admin_list_users DB 마이그레이션

## 목적
관리자 화면의 "전체 사용자" 목록에서 쓸 `admin_list_users` RPC를 추가한다. 03-decisions.md에 정의한 SQL을 스키마 파일에 반영하고, 사용자가 Supabase에 직접 실행할 단독 마이그레이션 파일도 만든다.

## 작업 범위
- 수정할 파일: `lib/supabase/schema.sql` — FEAT-005 섹션 추가, `admin_list_users(p_tenant_id UUID)` 함수 정의 (03-decisions.md의 SQL 그대로)
- 생성할 파일: `C:\Users\resta\Downloads\password-reset-migration.sql` — 사용자가 Supabase SQL Editor에서 직접 실행할 단독 마이그레이션 (schema.sql의 FEAT-005 섹션만 발췌)

## 완료 기준
- [ ] `schema.sql`에 `admin_list_users` 함수가 추가됨 (`REVOKE`/`GRANT`까지 포함)
- [ ] Downloads에 단독 마이그레이션 파일 생성됨
- [ ] 사용자가 Supabase에 실행 후, 관리자 계정으로 `select * from admin_list_users('<tenant_id>')` 호출 시 테넌트 내 전체 사용자가 반환됨 (SQL Editor에서 직접 확인)
- [ ] 관리자가 아닌 계정으로 호출하면 빈 결과가 반환됨

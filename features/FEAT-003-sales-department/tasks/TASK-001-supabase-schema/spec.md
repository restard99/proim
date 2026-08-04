# TASK-001: Supabase 스키마

## 목적
영업부 업무일지 취합/상신과 연간 목표 관리를 위한 Supabase 테이블을 만든다.

## 작업 범위
- 수정할 파일: `lib/supabase/schema.sql` (테이블 4개 + RLS 정책 추가), `lib/supabase/seed.sql` (`team_hierarchy`에 영업채산팀→영업팀 시드 1행 추가)

## 완료 기준
- [ ] `team_hierarchy(id, tenant_id, team, reports_to_team)` 테이블 생성, `(tenant_id, team)` UNIQUE
- [ ] `daily_reports(id, tenant_id, author_id, team, report_date, visited_customers, content, notes, status, created_at, updated_at)` 테이블 생성, `(tenant_id, author_id, report_date)` UNIQUE
- [ ] `team_daily_reports(id, tenant_id, team, author_id, report_date, content, status, submitted_at, created_at, updated_at)` 테이블 생성, `(tenant_id, team, report_date)` UNIQUE
- [ ] `sales_targets(id, tenant_id, year, customer_code, target_amount)` 테이블 생성, `(tenant_id, year, customer_code)` UNIQUE
- [ ] 4개 테이블 모두 `tenant_id UUID NOT NULL` 포함, RLS 활성화
- [ ] RLS 정책: 본인 작성 글은 본인만 INSERT/UPDATE, 같은 테넌트는 SELECT 가능, 팀장(`role = 'leader'`)은 소속팀 `daily_reports` 전체 SELECT 가능 (FEAT-001의 `my_tenant_id()` 패턴 재사용)
- [ ] `seed.sql`에 `team_hierarchy` 시드 1행(`영업채산팀` → `영업팀`) 추가, 재실행해도 안전(`ON CONFLICT`)
- [ ] 로컬 Supabase(또는 대시보드 SQL editor)에 적용해 오류 없이 실행되는 것 확인

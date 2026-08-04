# TASK-001: Supabase 스키마 — 아티팩트

## 상태: 완료 (Supabase 대시보드에서 실행 필요)

## 구현 내용
영업부 업무일지 취합/상신과 연간 매출 목표 관리를 위한 테이블 4개(`team_hierarchy`, `daily_reports`, `team_daily_reports`, `sales_targets`)와 RLS 정책을 `schema.sql`에 추가했다. `seed.sql`에는 영업채산팀 → 영업팀 보고 라인 예외 시드를 추가했다.

## 생성/수정된 파일
- `lib/supabase/schema.sql`: FEAT-003 섹션 추가 (테이블 4개, RLS 정책, 인덱스)
- `lib/supabase/seed.sql`: `team_hierarchy` 시드 1행 추가

## 완료 기준 확인
- [x] `team_hierarchy` 테이블 생성, `(tenant_id, team)` UNIQUE
- [x] `daily_reports` 테이블 생성, `(tenant_id, author_id, report_date)` UNIQUE
- [x] `team_daily_reports` 테이블 생성, `(tenant_id, team, report_date)` UNIQUE
- [x] `sales_targets` 테이블 생성, `(tenant_id, year, customer_code)` UNIQUE
- [x] 4개 테이블 모두 `tenant_id UUID NOT NULL`, RLS 활성화
- [x] RLS 정책: 본인 글 SELECT/INSERT/UPDATE, 팀장(`role IN ('leader','admin')`)은 소속팀 `daily_reports` 전체 SELECT, 상위 보고 대상 팀장은 `team_daily_reports`(상신된 것만) SELECT
- [x] `seed.sql`에 `team_hierarchy` 시드 추가, `ON CONFLICT ... DO UPDATE`로 재실행 안전
- [ ] 로컬에 Supabase 프로젝트 접속 정보(`.env.local`)가 없어 이번 세션에서 직접 실행/검증하지 못했다 — **Supabase 대시보드 SQL Editor에서 `schema.sql`과 `seed.sql`의 FEAT-003 섹션을 직접 실행해 오류 없이 적용되는지 확인 필요**

## 이슈 및 결정사항
- 이 개발 환경에는 Supabase 프로젝트 접속 정보가 없어(로컬 `.env.local` 미설정) SQL을 직접 실행해보지 못했다. FEAT-001의 관리자 계정 시드와 동일하게, Supabase 대시보드 SQL Editor에서 수동 실행이 필요하다.
- `team_daily_reports_upstream_select` 정책은 `team_hierarchy`와 `profiles`를 조인하는데, 두 테이블 모두 자체 RLS가 있지만 `daily_reports`/`team_daily_reports`의 정책에서 그 테이블들을 참조하는 구조라 FEAT-001에서 겪었던 "본인 테이블 자기참조 재귀" 문제와는 다르다 (재귀 조건: 같은 테이블 정책이 자기 자신을 서브쿼리로 참조할 때만 발생). 다만 실제 배포 후 재귀 오류가 나면 `team_hierarchy`/`profiles` 조회 부분을 SECURITY DEFINER 함수로 감싸는 방식(FEAT-001의 `my_tenant_id()` 패턴)으로 교체해야 한다.

# TASK-001: Supabase 스키마/RLS

## 목적
목표(계획) 값과 임원 코멘트를 저장할 테이블 2개를 생성한다.

## 작업 범위
- 수정할 파일: `lib/supabase/schema.sql` (executive_targets, executive_weekly_comments 테이블 + RLS 정책 추가)
- Supabase 프로젝트에 마이그레이션 직접 적용 (SQL 실행)

## 완료 기준
- [ ] `executive_targets` 테이블 생성 (tenant_id 포함, unique 제약 포함)
- [ ] `executive_weekly_comments` 테이블 생성 (tenant_id 포함)
- [ ] RLS: `executive_targets` select는 admin/임원실만, insert/update는 admin만
- [ ] RLS: `executive_weekly_comments` select는 admin/임원실/전략기획실만, insert는 admin/임원실만
- [ ] 실제 Supabase 프로젝트에 반영 완료 (schema.sql에만 기록하고 끝내지 않음)

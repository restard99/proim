# TASK-001: Supabase 스키마

## 목적
섬들채 업장별 매출목표·실적 스냅샷을 저장할 `executive_seomdeulchae_unit_report` 테이블을 만든다.

## 작업 범위
- 수정할 파일: `lib/supabase/schema.sql`

## 완료 기준
- [ ] `executive_seomdeulchae_unit_report` 테이블(tenant_id 포함, UNIQUE(tenant_id, as_of_date, business_unit))
- [ ] SELECT: 임원실+관리자, INSERT/DELETE: 관리자만 (기존 `executive_targets` 정책과 동일한 팀 조건)
- [ ] Supabase에 실제 적용(단독 마이그레이션 파일 생성)

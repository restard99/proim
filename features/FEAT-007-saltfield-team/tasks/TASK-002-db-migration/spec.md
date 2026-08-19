# TASK-002: DB 마이그레이션

## 목적
생산량·부자재재고현황을 저장할 테이블과 RLS 정책을 만든다.

## 작업 범위
- 수정할 파일: `lib/supabase/schema.sql` (FEAT-007 섹션 추가)
- 생성할 파일: 사용자가 Supabase SQL Editor에서 직접 실행할 standalone SQL 파일 (다운로드 폴더)
- 테이블: `saltfield_production_records`(날짜별 upsert, `UNIQUE(tenant_id, record_date)`), `saltfield_materials`(전체 교체 방식)
- RLS: SELECT는 염전관리팀 전체+admin, INSERT도 동일(팀장 제한 없음), tenant_id 필수

## 완료 기준
- [ ] 두 테이블 모두 `tenant_id UUID NOT NULL REFERENCES tenants(id)` 포함
- [ ] RLS 정책이 염전관리팀 팀원/팀장 구분 없이 SELECT/INSERT 허용
- [ ] 다른 팀 계정으로는 SELECT 시 빈 결과만 나옴 (RLS로 차단)
- [ ] 사용자가 Supabase SQL Editor에서 실행 완료 확인

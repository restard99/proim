# TASK-002: DB 마이그레이션 — 아티팩트

## 상태: 완료 (Supabase 반영 대기)

## 구현 내용
생산량(`saltfield_production_records`, 날짜별 upsert)과 부자재재고현황(`saltfield_materials`, 업로드 시 전체 교체) 두 테이블과 RLS 정책을 작성했다.

## 생성/수정된 파일
- `lib/supabase/schema.sql`: FEAT-007 섹션 추가
- `C:\Users\resta\Downloads\saltfield-team-migration.sql`: Supabase SQL Editor에서 수동 실행할 standalone 파일

## 완료 기준 확인
- [x] 두 테이블 모두 `tenant_id UUID NOT NULL REFERENCES tenants(id)` 포함
- [x] RLS 정책이 염전관리팀 팀원/팀장 구분 없이 SELECT/INSERT 허용 (팀장 제한 없음)
- [ ] 다른 팀 계정으로 SELECT 시 빈 결과만 나오는지 — Supabase 반영 후 확인 필요
- [ ] 사용자가 Supabase SQL Editor에서 실행 완료 — **대기 중**

## 이슈 및 결정사항
FEAT-005 TASK-002 때와 동일하게, SQL Editor 실행 role을 `postgres`로 맞춰야 `permission denied for schema public` 오류 없이 실행된다 (참고: `features/FEAT-005-password-reset/tasks/TASK-002-admin-list-users-rpc/artifact.md`).

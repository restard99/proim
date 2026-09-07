# TASK-001: Supabase 스키마 — 아티팩트

## 상태: 코드 작성 완료 (Supabase 적용 대기)

## 구현 내용
`production_material_inventories` 테이블과 RLS 정책, `production-material-inventory` Storage 버킷을 `production_logs`와 동일한 패턴으로 추가했다. 생산팀은 팀원/팀장 구분 없이 업로드 가능하고, 삭제는 본인 것 또는 관리자만 가능하다(수정 기능 없음 — UPDATE 정책 없음).

## 생성/수정된 파일
- `lib/supabase/schema.sql`: FEAT-011 섹션 추가
- `C:\Users\resta\Downloads\production-material-inventory-migration.sql`: 사용자가 Supabase SQL Editor에서 직접 실행할 단독 마이그레이션 파일

## 완료 기준 확인
- [x] `production_material_inventories` 테이블 (tenant_id 포함)
- [x] SELECT/INSERT: 생산팀 전체 + 관리자
- [x] DELETE: 본인 것 또는 관리자 (UPDATE 정책 없음)
- [x] storage 버킷 + 정책 3종
- [x] `(tenant_id, snapshot_date DESC)` 인덱스
- [ ] Supabase에 실제 적용 — **사용자가 SQL Editor에서 `production-material-inventory-migration.sql` 실행 필요**

## 이슈 및 결정사항
이 프로젝트에는 스키마를 자동으로 원격 적용하는 수단이 없어(과거 FEAT-004도 동일), Downloads 폴더에 단독 마이그레이션 파일을 생성해 사용자가 Supabase 콘솔에서 직접 실행하도록 안내한다.

# TASK-001: Supabase 스키마

## 목적
생산일지(엑셀 업로드, 공정별 탭을 그대로 저장) 저장을 위한 `production_logs` 테이블과 RLS 정책, 첨부 원본 보관용 Storage 버킷을 추가한다.

## 작업 범위
- 수정할 파일: `lib/supabase/schema.sql` (FEAT-004 섹션 추가)
- 생성할 파일: `C:\Users\resta\Downloads\production-logs-migration.sql` (사용자가 Supabase SQL Editor에서 직접 실행할 단독 마이그레이션 파일)

## 완료 기준
- [ ] `production_logs` 테이블: `id, tenant_id, uploaded_by, team, period_label, file_path, file_name, sheets(JSONB), created_at`
- [ ] SELECT: 같은 tenant의 생산팀(팀원+팀장) + admin
- [ ] INSERT: 생산팀 소속이면 팀원/팀장 무관 + admin
- [ ] DELETE: 본인이 올린 것 또는 admin
- [ ] UPDATE 정책 없음(수정 기능 없음)
- [ ] `production-logs` Storage 버킷(private) + insert-own/select-authenticated/delete-own 정책 (`production-requests` 버킷과 동일 패턴)
- [ ] `tenant_id, period_label` 기준 인덱스

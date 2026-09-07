# TASK-001: Supabase 스키마

## 목적
원재료,반제품 현황 업로드 이력을 저장할 테이블과 RLS 정책, 파일 저장용 storage 버킷을 만든다.

## 작업 범위
- 수정할 파일: `lib/supabase/schema.sql` (production_logs 섹션 뒤에 새 섹션 추가)

## 완료 기준
- [ ] `production_material_inventories` 테이블 (tenant_id 포함) 정의
- [ ] SELECT/INSERT: 생산팀 전체(팀원+팀장) + 관리자, DELETE: 업로드한 본인 또는 관리자 (UPDATE 정책 없음)
- [ ] `production-material-inventory` storage 버킷 + 본인 폴더 업로드/삭제, 인증 사용자 조회 정책
- [ ] `(tenant_id, snapshot_date DESC)` 인덱스
- [ ] Supabase에 실제 적용해 정상 동작 확인

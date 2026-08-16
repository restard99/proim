# TASK-001: Supabase 스키마 — 아티팩트

## 상태: 배포 완료

## 구현 내용
생산일지 저장용 `production_logs` 테이블과 RLS 정책, `production-logs` Storage 버킷을 `production_requests`와 동일한 패턴으로 추가했다. 생산팀은 팀원/팀장 구분 없이 업로드 가능하고, 삭제는 본인 것 또는 관리자만 가능하도록 했다(수정 기능은 없어 UPDATE 정책은 두지 않음).

## 생성/수정된 파일
- `lib/supabase/schema.sql`: FEAT-004 섹션 추가 (`production_logs` 테이블, RLS 정책 3종, 인덱스, Storage 버킷+정책 3종)
- `C:\Users\restard\Downloads\production-logs-migration.sql`: 사용자가 Supabase SQL Editor에서 직접 실행할 단독 마이그레이션 파일

## 완료 기준 확인
- [x] `production_logs` 테이블 컬럼 구성
- [x] SELECT: 생산팀(팀원+팀장) + admin
- [x] INSERT: 생산팀 소속 누구나 + admin
- [x] DELETE: 본인 것 또는 admin
- [x] UPDATE 정책 없음
- [x] `production-logs` Storage 버킷 + 정책 3종
- [x] `tenant_id, period_label` 인덱스

## 이슈 및 결정사항
없음

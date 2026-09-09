# TASK-001: Supabase 스키마 — 아티팩트

## 상태: 대체됨 (superseded) — `executive_seomdeulchae_unit_report`는 TASK-009에서 `executive_seomdeulchae_unit_target`으로 교체되어 DROP됨

## 구현 내용
`executive_seomdeulchae_unit_report` 테이블과 RLS 정책을 `executive_targets`와 동일한 팀 조건(조회: 임원실+관리자, 입력/삭제: 관리자)으로 추가했다. 매주 통째로 갱신되는 스냅샷이라 UPDATE 정책은 두지 않았다.

## 생성/수정된 파일
- `lib/supabase/schema.sql`: FEAT-013 섹션 추가
- `C:\Users\resta\Downloads\executive-seomdeulchae-unit-report-migration.sql`: 단독 마이그레이션 파일

## 완료 기준 확인
- [x] 테이블(tenant_id 포함, UNIQUE(tenant_id, as_of_date, business_unit))
- [x] SELECT: 임원실+관리자, INSERT/DELETE: 관리자만
- [ ] Supabase에 실제 적용 — **사용자가 SQL Editor에서 `executive-seomdeulchae-unit-report-migration.sql` 실행 필요**

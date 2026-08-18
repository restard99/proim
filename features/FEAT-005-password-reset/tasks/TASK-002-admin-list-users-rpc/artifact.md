# TASK-002: admin_list_users DB 마이그레이션 — 아티팩트

## 상태: 완료 (Supabase 대시보드에서 실행 필요)

## 구현 내용
관리자 화면의 "전체 사용자" 목록에서 쓸 `admin_list_users` RPC를 추가했다. `profiles`와 `auth.users`를 조인해 이메일까지 반환하되, 가짜 도메인 이메일은 NULL로 바꿔 "미등록" 판별이 가능하게 했다. 관리자가 아니면 빈 결과를 반환한다.

## 생성/수정된 파일
- `lib/supabase/schema.sql`: FEAT-005 섹션 추가, `admin_list_users(p_tenant_id UUID)` 함수 정의
- `C:\Users\resta\Downloads\password-reset-migration.sql`: 사용자가 Supabase SQL Editor에서 직접 실행할 단독 마이그레이션 파일

## 완료 기준 확인
- [x] `admin_list_users` 함수 추가 (REVOKE/GRANT 포함)
- [x] Downloads에 단독 마이그레이션 파일 생성
- [ ] Supabase에 실행 후 관리자 계정으로 조회 확인 — **사용자가 SQL Editor에서 직접 실행 필요**
- [ ] 비관리자 호출 시 빈 결과 확인 — 실행 후 확인 필요

## 이슈 및 결정사항
없음

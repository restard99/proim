# TASK-002: admin_list_users DB 마이그레이션 — 아티팩트

## 상태: 배포 완료 (Supabase 반영 확인됨)

## 구현 내용
관리자 화면의 "전체 사용자" 목록에서 쓸 `admin_list_users` RPC를 추가했다. `profiles`와 `auth.users`를 조인해 이메일까지 반환하되, 가짜 도메인 이메일은 NULL로 바꿔 "미등록" 판별이 가능하게 했다. 관리자가 아니면 빈 결과를 반환한다.

## 생성/수정된 파일
- `lib/supabase/schema.sql`: FEAT-005 섹션 추가, `admin_list_users(p_tenant_id UUID)` 함수 정의
- `C:\Users\resta\Downloads\password-reset-migration.sql`: 사용자가 Supabase SQL Editor에서 직접 실행할 단독 마이그레이션 파일

## 완료 기준 확인
- [x] `admin_list_users` 함수 추가 (REVOKE/GRANT 포함)
- [x] Downloads에 단독 마이그레이션 파일 생성
- [x] Supabase에 실행 후 반영 확인 (SQL Editor role을 postgres로 지정 후 정상 실행됨)
- [ ] 비관리자 호출 시 빈 결과 확인 — TASK-006에서 앱 통해 최종 확인 예정

## 이슈 및 결정사항
**이슈**: 처음 실행 시 `permission denied for schema public` 오류 발생. SQL Editor가 `postgres`가 아닌 다른 role(예: authenticated)로 설정되어 있었던 것으로 추정. Run 버튼 근처의 role 드롭다운을 `postgres`로 바꿔 재실행하니 정상 반영됨. 이번 마이그레이션 SQL 자체의 문제는 아니었음.

# TASK-001: Supabase 스키마 — 아티팩트

## 상태: 배포 완료

## 구현 내용
`user_menu_grants` 테이블과 RLS 정책을 추가했다. 부여=행 추가, 회수=행 삭제 방식이라 UPDATE 정책은 두지 않았다.

## 생성/수정된 파일
- `lib/supabase/schema.sql`: FEAT-012 섹션 추가
- `C:\Users\resta\Downloads\user-menu-grants-migration.sql`: 사용자가 Supabase SQL Editor에서 직접 실행할 단독 마이그레이션 파일

## 완료 기준 확인
- [x] `user_menu_grants` 테이블(tenant_id 포함, UNIQUE 제약)
- [x] SELECT: 본인 것 또는 관리자
- [x] INSERT/DELETE: 관리자만
- [x] UPDATE 정책 없음
- [ ] Supabase에 실제 적용 — **사용자가 SQL Editor에서 `user-menu-grants-migration.sql` 실행 필요**

# TASK-001: Supabase 스키마

## 목적
개인별 메뉴 추가 허용 이력을 저장할 `user_menu_grants` 테이블과 RLS 정책을 만든다.

## 작업 범위
- 수정할 파일: `lib/supabase/schema.sql`

## 완료 기준
- [ ] `user_menu_grants` 테이블(tenant_id 포함, UNIQUE(tenant_id, user_id, menu_href))
- [ ] SELECT: 본인 것 또는 관리자
- [ ] INSERT/DELETE: 관리자만
- [ ] UPDATE 정책 없음(부여=insert, 회수=delete)
- [ ] Supabase에 실제 적용(단독 마이그레이션 파일 생성해 사용자 안내)

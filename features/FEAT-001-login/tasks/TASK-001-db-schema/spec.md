# TASK-001: DB 스키마 확장

## 목적
`profiles` 테이블을 회원가입 승인 흐름에 맞게 확장하고, 이름+소속팀 조합을 로그인 식별자로 쓸 수 있도록 제약을 추가한다.

## 작업 범위
- 수정할 파일: `lib/supabase/schema.sql`
- 생성할 파일: `lib/supabase/seed.sql` (기본 tenant row, 관리자 계정 시드용 SQL. 관리자 `auth.users` 생성은 Supabase 대시보드에서 수동으로 하고, 이 스크립트는 해당 계정의 `profiles` row(`role='admin'`, `status='approved'`)만 채우는 것으로 문서화)

## 완료 기준
- [ ] `profiles`에 `team`, `status`, `approved_by`, `approved_at` 컬럼 추가
- [ ] `role` 체크 제약이 `member`/`leader`/`ceo`/`admin` 4종을 허용
- [ ] `(tenant_id, full_name, team)` 유니크 제약 추가
- [ ] 관리자가 같은 테넌트의 모든 `profiles`를 조회·수정할 수 있는 RLS 정책 추가
- [ ] 기본 tenant 1건 시드 완료 (`태평염전`)

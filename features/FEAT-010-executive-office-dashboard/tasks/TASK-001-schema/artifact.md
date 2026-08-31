# TASK-001: Supabase 스키마/RLS — 아티팩트

## 상태: 완료

## 구현 내용
`executive_targets`(목표 값), `executive_weekly_comments`(임원 코멘트) 테이블을 추가하고 RLS 정책을 설정했다. 사용자가 Supabase SQL Editor에서 직접 실행해 반영했고, REST API로 두 테이블 모두 정상 조회됨을 확인했다.

## 생성/수정된 파일
- `lib/supabase/schema.sql`: FEAT-010 섹션 추가 (테이블 2개 + RLS 정책 + 인덱스)

## 완료 기준 확인
- [x] `executive_targets` 테이블 생성 (tenant_id 포함, unique 제약 포함)
- [x] `executive_weekly_comments` 테이블 생성 (tenant_id 포함)
- [x] RLS: `executive_targets` select는 admin/임원실만, insert/update는 admin만
- [x] RLS: `executive_weekly_comments` select는 admin/임원실/전략기획실만, insert는 admin/임원실만
- [x] 실제 Supabase 프로젝트에 반영 완료 (REST API로 두 테이블 조회 확인)

## 이슈 및 결정사항
`.env.local`에 직접 Postgres 접속 문자열이 없어 CLI로 자동 적용할 수 없었다. 사용자가 Supabase SQL Editor에 직접 붙여넣어 실행하는 방식으로 진행했다.

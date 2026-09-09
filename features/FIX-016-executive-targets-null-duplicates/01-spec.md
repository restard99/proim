# FIX-016: executive_targets에 같은 값이 업로드할 때마다 중복 행으로 쌓이는 문제

## 문제 상황
"매출목표관리"에서 워크북을 다시 업로드할 때마다, 이미 있던 값이 갱신되지 않고 같은 내용의 행이 계속 새로 추가된다(실측: 태평소금 특정 주/월 계획이 5~7개씩 중복).

## 원인
`executive_targets`의 중복 방지 조건은 `UNIQUE (tenant_id, metric, corp_code, category, period_type, period_key)`인데, `corp_code`(생산 목표는 항상 NULL)와 `category`(매출 목표는 항상 NULL)가 조건에 포함돼 있다. PostgreSQL의 일반 UNIQUE 제약은 NULL끼리를 "서로 다른 값"으로 취급하기 때문에, 업로드할 때마다 `ON CONFLICT` 매칭이 안 되어 기존 값을 덮어쓰지 못하고 매번 새 행이 추가됐다.

## 기대 동작
같은 (tenant_id, metric, corp_code, category, period_type, period_key) 조합은 NULL이 섞여 있어도 항상 하나의 행으로 취급되어, 재업로드 시 값이 갱신되고 중복이 쌓이지 않는다.

## 영향 범위
- `lib/supabase/schema.sql`: `executive_targets`의 UNIQUE 제약을 `UNIQUE NULLS NOT DISTINCT`로 변경
- 마이그레이션: 기존에 쌓인 중복 행 정리(최신 값만 남김) + 제약 재생성

# TASK-004: Y-ERP 태평소금 생산실적 모듈 — 아티팩트

## 상태: 완료

## 구현 내용
기존 `production-output.ts`의 `getProductionByCategory`가 이미 임의 기간(주간/월간/전년동월)에 대해 천일염/가공염 생산량(kg)을 정확히 반환하고 있어, 새 쿼리를 만들지 않고 얇은 래퍼로 감쌌다.

## 생성/수정된 파일
- `lib/yerp/executive-production.ts` (신규): `getTaepyeongSogeumProduction`

## 완료 기준 확인
- [x] 임의 기간(주간/월간/전년동월)을 넣으면 천일염/가공염 생산량(kg) 반환
- [x] 기존 `getProductionByCategory`와 결과 일치 (동일 함수를 그대로 호출)
- [x] `npx tsc --noEmit` 통과

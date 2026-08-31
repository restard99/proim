# TASK-004: Y-ERP 태평소금 생산실적 모듈

## 목적
주간업무보고 4페이지(태평소금 생산 - 천일염/가공염 주간 생산실적)에 쓰일 데이터를 Y-ERP에서 집계한다.

## 작업 범위
- 생성할 파일: `lib/yerp/executive-production.ts` (기존 `lib/yerp/production-output.ts`의 `getProductionByCategory` 패턴을 주간 단위로 재사용/래핑)

## 완료 기준
- [ ] 임의 기간(주간/월간/전년동월)을 넣으면 천일염/가공염 생산량(kg) 반환
- [ ] 기존 `getProductionByCategory`와 결과가 일치 (동일 로직 재사용 확인)
- [ ] `npx tsc --noEmit` 통과

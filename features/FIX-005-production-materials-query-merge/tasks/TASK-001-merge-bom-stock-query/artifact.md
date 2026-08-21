# TASK-001: BOM 조회와 재고 조회 쿼리 통합 — 아티팩트

## 상태: 완료

## 수정 내용
`getMaterialStatusForItems`에서 BOM 조회 후 별도로 실행하던 자재 재고 조회를 `OUTER APPLY` 상관 서브쿼리로 하나의 쿼리에 합쳤다. 완제품 매칭이 있는 경우 DB 왕복이 3번(완제품 목록 → BOM → 재고) → 2번(완제품 목록 → BOM+재고 통합)으로 줄어든다.

## 수정된 파일
- `lib/yerp/production-materials.ts`: BOM 쿼리에 `OUTER APPLY`로 재고 집계 서브쿼리를 붙여 `stockRows` 별도 쿼리 제거. `bomByMother`/`stockMap` 구성 로직을 통합된 결과에서 한 번에 처리하도록 수정

## 완료 기준 확인
- [x] BOM과 재고를 하나의 쿼리로 조회
- [x] 기존과 동일한 필드 반환
- [x] 재고 이력 없는 자재도 `availableQty: 0`으로 정상 처리 (`OUTER APPLY` + `QTY ?? 0`)
- [x] `npx tsc --noEmit` 통과

## 검증
실제 Y-ERP DB(0460)에서 BOM 자재가 2개 이상인 완제품 3건(6개 BOM 행)을 골라, 기존 2-쿼리 방식과 새 통합 쿼리 결과를 스크립트로 직접 비교 — 자재코드/소요수량/품목명/재고수량 전부 6/6 일치(불일치 0건).

## 이슈 및 결정사항
`GROUP BY`로 합치면 동일 (모품목,자품목) 조합의 BOM 중복 행이 있을 경우 결과가 줄어드는 위험이 있어, 원래 BOM 행 개수를 그대로 보존하는 `OUTER APPLY` 상관 서브쿼리 방식을 선택했다.

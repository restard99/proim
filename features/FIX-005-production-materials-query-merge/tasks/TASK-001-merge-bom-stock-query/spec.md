# TASK-001: BOM 조회와 재고 조회 쿼리 통합

## 목적
`getMaterialStatusForItems`에서 BOM 조회 후 별도로 실행하던 재고 조회를 하나의 JOIN 쿼리로 합쳐 DB 왕복을 줄인다.

## 작업 범위
- 수정할 파일: `lib/yerp/production-materials.ts`

## 완료 기준
- [ ] BOM(`PD_BOM_MGMT`+`PM_ITEM`)과 재고(`PM_QTY_IO`+`PM_IO_CODE`)를 하나의 쿼리로 조회
- [ ] 기존과 동일한 필드(`CHIDL_ITM_CD`, `REAL_DEMAND_QTY`, `ITM_NM`, 재고 `QTY`)를 반환
- [ ] 재고가 없는(BOM에는 있지만 입출고 이력이 없는) 자재도 `availableQty: 0`으로 정상 처리
- [ ] `npx tsc --noEmit` 통과

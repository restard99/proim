# FIX-005: 생산의뢰서 자재 재고 확인 쿼리 통합

## 문제 상황
생산의뢰서 화면에서 각 제품의 부자재 소요/재고를 확인할 때 Y-ERP(MSSQL) DB로 최대 3번 순차 왕복한다: (1) 완제품 목록 조회 → JS에서 제품명 매칭 → (2) 매칭된 완제품의 BOM(자재 구성) 조회 → (3) BOM에 나온 자재들의 재고 조회. 리전을 서울로 옮긴 뒤에도 페이지 로딩에 3~4초가 걸리는데, 이 순차 왕복이 그 중 일부를 차지한다.

## 현재 동작
`lib/yerp/production-materials.ts`의 `getMaterialStatusForItems`가 BOM 조회와 재고 조회를 서로 다른 쿼리로 순차 실행한다 (BOM 결과의 CHIDL_ITM_CD를 알아야 재고 쿼리 조건을 만들 수 있어서).

## 기대 동작
BOM 조회와 재고 조회를 하나의 JOIN 쿼리로 합쳐서, 완제품 매칭 이후에는 DB 왕복이 2번(완제품 목록 + BOM·재고 통합)으로 줄어든다. 결과 데이터는 기존과 동일해야 한다.

## 영향 범위
- `lib/yerp/production-materials.ts`: `getMaterialStatusForItems` 내부 쿼리 로직만 수정, 함수 시그니처·반환 타입은 변경 없음
- `app/actions/production-requests.ts`: 호출부 변경 없음 (내부 구현만 바뀜)

# TASK-006: 수금현황 화면 — 아티팩트

## 상태: 완료

## 구현 내용
당초 계획했던 `PM_RCB_COLLECT_MGMT`/`PM_AR_CUST.CURRENT_RCP`는 태평소금(0460) 기준으로 실질적으로 비어있어(수금 전용 화면을 안 쓰고 회계 담당자가 일반전표에 직접 분개하는 관행), 사용자가 직접 원장 구조를 확인해 알려준 방식대로 `AC_GNR_SLIP_T`(일반전표)의 매출채권 계정(외상매출금 0108, 받을어음 0110) 대변을 수금으로 간주해 구현했다.

## 생성/수정된 파일
- `lib/yerp/collections.ts`: `getCollectionsByCustomer`(기간 내 거래처별 수금액 + 조회 시점 기준 잔액), `getCollectionsSummary`(합계)
- `app/actions/collections.ts`: `getCollectionsData`
- `components/collections/CollectionsView.tsx`: 기준월 선택 + 거래처 검색, 요약 카드, 표
- `app/(app)/collections/page.tsx`

## 완료 기준 확인
- [x] 요약 카드(이 달 수금액, 미수금 잔액, 미수 거래처 수) + 거래처별 표
- [x] 표에 거래처, 기준월, 수금액, 잔액 표시 (월 단위 — 일자별 수금 데이터는 없음)
- [x] 데이터 없음 상태 UI 포함 (로딩은 `useTransition` pending 상태로 자연스럽게 이전 데이터 유지)
- [x] `npm run build`, `npx tsc --noEmit`, `npx eslint` 통과
- [x] 실제 접속 정보로 동일 쿼리를 직접 실행해 2026년 7월 기준 27개 거래처 수금 내역, 117개 거래처 잔액이 정상 조회되는 것을 확인

## 이슈 및 결정사항
- **Y-ERP 소스 테이블 재확정**: `PM_AR_CUST.CURRENT_RCP`/`FR_AR_AMT`가 2023~2026 전체 기간 태평소금 기준 0/NULL임을 확인했고, 사용자가 실제 회계 처리 흐름(수금을 일반전표에 직접 분개)을 알려줘서 `AC_GNR_SLIP_T`의 매출채권 계정(대변=수금, 차변-대변 누계=잔액)으로 소스를 교체했다.
- 계정과목은 `LIKE '0108%'`, `LIKE '0110%'`로 하위 계정까지 포함하도록 안전하게 조회한다 (사용자 권고).
- "잔액"은 선택한 기준월 말일까지의 누적(전체 이력 기준)이고, "수금액"은 선택한 월 안에서 발생한 대변 합계만이다 — 서로 다른 기간 개념이라 혼동하지 않도록 컴포넌트 주석 대신 쿼리 함수명(`getCollectionsByCustomer`)과 파라미터명(`startDate`/`endDate`만 받고 잔액은 내부적으로 `endDate` 이하 전체를 누적)으로 구분했다.
- 잔액이 음수인 거래처(예: 선수금/과납 상태)도 실제 계산값 그대로 보여준다 — 목업처럼 0으로 뭉개지 않았다.
- `sales_targets`와 달리 별도 Supabase 테이블 없이 Y-ERP만으로 완결된다.

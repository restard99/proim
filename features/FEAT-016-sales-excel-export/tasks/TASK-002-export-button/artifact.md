# TASK-002: 화면에 엑셀 다운로드 버튼 연결 — 아티팩트

## 상태: 배포 완료

## 구현 내용
거래처별 매출 화면의 조회조건 줄(검색 버튼 옆)에 "엑셀 다운로드" 버튼을 추가했다. 연간목표대비 탭에서는 버튼 자체를 숨긴다. 클릭 시 현재 탭/기간/검색어로 `exportSalesExcel`을 호출하고 base64 결과를 다운로드한다 (`DisbursementsView.tsx`와 동일한 패턴).

## 생성/수정된 파일
- `components/sales/SalesByCustomerView.tsx`: `exportSalesExcel` import, `downloadBase64` 헬퍼, `isExporting` 상태, `handleExport`, 버튼 UI 추가

## 완료 기준 확인
- [x] 실제 Y-ERP 데이터(2026-07, 주간/월간 각각)로 독립 스크립트를 통해 `exportSalesExcel`과 동일한 로직을 직접 실행해 요약/상세 구조와 숫자를 검증 — 그룹 구분행, 지점별 금액(주간), 업체별 합계+제품별 수량/금액(월간) 모두 화면 로직과 일치
- [x] 연간목표대비 탭에서는 버튼이 렌더링되지 않음 (코드 조건 `period !== "yearly"`)
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 모두 통과

## 이슈 및 결정사항
없음.

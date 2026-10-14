# 거래처별 매출 엑셀 내보내기 개발 결정사항

## 라우트 구조
- 별도 라우트 없음. 기존 `/sales` 화면에 버튼만 추가
- 신규 Server Action: `exportSalesExcel(params)` in `app/actions/sales.ts`
  - `FEAT-015`의 `exportDisbursementsExcel`과 동일한 반환 패턴(`{ ok: true; base64; fileName } | { ok: false; message }`) 재사용

## 데이터베이스 스키마
변경 없음.

## 데이터 조회 방식
- 요약: 기존 `getSalesByCustomer()` → `groupCustomerSales()`로 화면과 동일하게 그룹핑 (둘 다 "server-only" 의존성 없는 순수 함수라 Server Action에서 그대로 재사용 가능)
- 월간/월누적 상세: 출금조회(FEAT-015)와 달리 `getProductSalesByCustomers()`가 이미 `customerCodes: string[]`를 받아 한 번에 조회하는 구조라 **별도 일괄조회 함수를 새로 만들 필요 없음** — 그룹핑 결과에서 전체 거래처코드를 모아 한 번만 호출
- 주간 상세: 추가 조회 없음 (그룹별 `details`에 이미 지점별 금액/최근거래일이 들어있음)

## 컴포넌트/파일 구조
- `app/actions/sales.ts`: `exportSalesExcel(input: { period: "weekly"|"monthly"|"mtd"; startDate; endDate; search? })` 추가
  - 요약: 그룹핑 결과(`GroupedCustomerSales[]`) → 거래처/매출액/최근거래일
  - 상세(주간): 그룹이면 그룹명 구분행 + 지점별 행, 개별 거래처면 자기 자신 한 행
  - 상세(월간/월누적): 그룹/거래처별로 "업체" 단위(그룹이면 지점들, 개별이면 자기 자신) 구분행 + 업체별 제품명/수량/금액 행 — 화면의 `companies`/제품 펼치기 로직과 동일 구조
  - 요약 결과가 비어 있으면 `{ ok: false, message: "내보낼 데이터가 없습니다." }`
  - 파일명: `거래처별매출_{탭라벨}_{startDate}_{endDate}.xlsx`
- `components/sales/SalesByCustomerView.tsx`: "엑셀 다운로드" 버튼 추가 (연간목표대비 탭에서는 숨김)
  - `useTransition`으로 `isExporting` 관리, `downloadBase64` 헬퍼는 기존 관례대로 로컬에 추가
  - 비활성 조건: `groupedRows.length === 0` 또는 `isExporting` 또는 `period === "yearly"`(버튼 자체를 숨김)

## 외부 의존성
없음.

## 결정 근거
- `getProductSalesByCustomers`가 이미 다건 조회를 지원해 FEAT-015처럼 별도 일괄조회 함수를 새로 만들 필요가 없었음 — 기존 함수를 그대로 재사용해 범위를 최소화
- 탭(주간 vs 월간/월누적)마다 상세 내용 수준이 다른 건 화면의 기존 동작(`showProductDrilldown`)을 그대로 반영한 것일 뿐, 엑셀만의 새로운 규칙을 만들지 않음

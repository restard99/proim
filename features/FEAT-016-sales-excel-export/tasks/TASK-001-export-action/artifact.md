# TASK-001: 엑셀 생성 Server Action — 아티팩트

## 상태: 배포 완료

## 구현 내용
`exportSalesExcel()`을 추가했다. `getSalesByCustomer()` → `groupCustomerSales()`로 화면과 동일하게 요약을 만들고, 월간/월누적일 때만 전체 거래처코드를 모아 `getProductSalesByCustomers()`를 한 번 호출해 제품 내역을 붙인다. 주간은 지점별 금액까지, 월간/월누적은 업체별 제품명/수량/금액까지 담은 한 시트짜리 엑셀을 base64로 반환한다.

## 생성/수정된 파일
- `app/actions/sales.ts`: `exportSalesExcel(input)`, `ExportResult` 타입, `formatDateDot`/`companiesOf` 헬퍼 추가

## 완료 기준 확인
- [x] 요약 행은 `groupCustomerSales()` 결과를 그대로 사용하므로 화면과 숫자 일치
- [x] 주간 상세 섹션은 지점별 이름/금액/최근거래일 3컬럼까지만 (제품 내역 없음)
- [x] 월간/월누적 상세 섹션은 업체별 금액 + 제품명/수량/금액까지 포함
- [x] 요약이 빈 경우 `{ ok: false, message: "내보낼 데이터가 없습니다." }` 반환
- [x] `npx tsc --noEmit` 통과

## 이슈 및 결정사항
- 최초 작성 시 상세 섹션에서 그룹 하위 행에 빈 문자열("")로 한 칸씩 밀어서 쓰는 방식(FEAT-015 패턴을 그대로 흉내)으로 작성했다가, 헤더 컬럼(거래처/매출액/최근거래일)과 데이터 컬럼이 밀려서 어긋나는 걸 발견해 수정함 — 지점/업체/제품 행 모두 헤더와 같은 컬럼 의미를 유지하도록 다시 작성(그룹 구분행만 이름 한 칸, 나머지 데이터행은 헤더와 동일한 컬럼 수를 그대로 채움).

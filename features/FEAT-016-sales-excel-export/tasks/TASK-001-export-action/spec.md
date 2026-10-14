# TASK-001: 엑셀 생성 Server Action

## 목적
현재 조회조건(탭/기간/검색어)에 맞는 거래처(그룹) 요약 + 전체 상세내역을 한 시트짜리 엑셀 파일로 만들어 base64로 반환하는 Server Action을 만든다.

## 작업 범위
- 수정할 파일: `app/actions/sales.ts`

구현 내용:
- `ExportResult` 타입 로컬 정의 (`FEAT-015`와 동일한 형태)
- `exportSalesExcel(input: { period: "weekly" | "monthly" | "mtd"; periodLabel: string; startDate: string; endDate: string; search?: string }): Promise<ExportResult>` 추가
  - `getSalesByCustomer(input)` → `groupCustomerSales()` 순서로 요약 목록을 만든다
  - 요약 목록이 비어 있으면 `{ ok: false, message: "내보낼 데이터가 없습니다." }`
  - `period === "monthly" || period === "mtd"`일 때만: 그룹핑 결과에서 전체 거래처코드(그룹이면 `details`의 코드들, 개별이면 자기 자신)를 모아 `getProductSalesByCustomers()`를 한 번 호출해 `customerCode -> 제품목록` 맵을 만든다
  - ExcelJS로 워크시트 1개 작성:
    1. 제목행: `거래처별 매출 - {periodLabel} ({startDate} ~ {endDate})`
    2. 빈 행
    3. 요약 헤더행: 거래처 / 매출액 / 최근거래일
    4. 그룹핑 결과 요약 행 (그룹은 `(N개 지점)` 표시 없이 그룹명만)
    5. 빈 행
    6. 상세 헤더행
    7. 주간(`period === "weekly"`): 그룹이면 그룹명 구분행 + 지점별 행(거래처명/금액/최근거래일), 개별 거래처면 자기 자신 한 행만
    8. 월간/월누적: 그룹/거래처별로 "업체" 단위 구분행(업체명+금액) + 제품명/수량/금액 행 (화면의 `companies`/제품 펼치기와 동일 구조, 제품 내역 없으면 "제품 내역이 없습니다" 한 행)
  - 파일명: `거래처별매출_{periodLabel}_{startDate}_{endDate}.xlsx`

## 완료 기준
- [ ] 요약 행 숫자가 화면의 `groupCustomerSales(data.rows)` 결과와 일치
- [ ] 주간 탭 상세에 제품 내역이 포함되지 않음 (지점별 금액까지만)
- [ ] 월간/월누적 탭 상세에 업체별 제품명/수량/금액까지 포함됨
- [ ] 데이터 없음 케이스에서 `ok: false` 반환
- [ ] `npx tsc --noEmit` 통과

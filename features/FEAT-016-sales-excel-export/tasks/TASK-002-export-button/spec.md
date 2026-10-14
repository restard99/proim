# TASK-002: 화면에 엑셀 다운로드 버튼 연결

## 목적
거래처별 매출 화면(주간/월간/월누적 탭)에 "엑셀 다운로드" 버튼을 추가해, 현재 조회조건으로 TASK-001의 Server Action을 호출하고 결과 파일을 다운로드한다.

## 작업 범위
- 수정할 파일: `components/sales/SalesByCustomerView.tsx`

구현 내용:
- `02-design.html`의 버튼 위치(조회조건 줄, 검색 버튼 옆)에 맞춰 버튼 추가, `period === "yearly"`일 때는 버튼을 숨김
- `exportSalesExcel` import, `isExporting`/`startExporting`(`useTransition`) 상태 추가
- `downloadBase64(base64, fileName)` 헬퍼를 로컬에 추가 (기존 `ProfitLossView.tsx`/`DisbursementsView.tsx`와 동일한 구현)
- 버튼 클릭 시 현재 `period`, 탭 라벨(`PERIOD_TABS`에서 찾기), `startYmd`/`endYmd`, `search` 값으로 액션 호출 → 성공 시 `downloadBase64` 호출
- 버튼 비활성 조건: `groupedRows.length === 0` 또는 `isExporting`
- `isExporting`일 때 버튼 라벨을 "생성 중…"으로 바꾸고 스피너 아이콘 표시 (`DisbursementsView.tsx`와 동일한 패턴)

## 완료 기준
- [ ] 주간/월간/월누적 각 탭에서 버튼 클릭 시 해당 탭 조건의 엑셀 파일이 다운로드됨
- [ ] 연간목표대비 탭에는 버튼이 보이지 않음
- [ ] 데이터 없음 상태에서 버튼이 비활성화됨
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 모두 통과

# TASK-005: 거래처별 매출 화면

## 목적
Y-ERP 데이터를 기반으로 거래처별 매출을 주간/월간/월누적/연간목표대비 기준으로 조회한다.

## 작업 범위
- 생성할 파일:
  - `lib/yerp/sales.ts` (`AC_PURC_SALE_T`, `PURC_SALE_SEC='1'`, `CORP_CODE='0460'` 기준 기간별 집계 쿼리 함수)
  - `app/(app)/sales/page.tsx`
  - `components/sales/SalesByCustomerView.tsx` (기간 탭, 비교기준 드롭다운, 표, 연간목표대비 진행률)
  - `app/actions/sales-targets.ts` (연간 목표 조회/등록 — `sales_targets` 테이블)
- 수정할 파일: 없음

## 완료 기준
- [ ] `02-design.html`의 "거래처별 매출" 화면과 동일하게 주간/월간/월누적/연간목표대비 탭 전환 구현
- [ ] 주간은 월~일 단위로 이전/다음 주 이동 가능
- [ ] "비교 기준"(전주/전월/전년 동기 대비) 드롭다운으로 카드 값이 바뀜
- [ ] 연간목표대비 탭은 `sales_targets`의 목표값과 Y-ERP 누적 매출을 비교해 진행률(%) 표시
- [ ] 거래처 검색으로 표 필터링 가능
- [ ] `npm run build` 통과

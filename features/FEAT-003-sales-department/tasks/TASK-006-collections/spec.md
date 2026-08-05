# TASK-006: 수금현황 화면

## 목적
Y-ERP 데이터를 기반으로 거래처별 수금현황과 미수금 잔액을 조회한다.

## 작업 범위
- 생성할 파일:
  - `lib/yerp/collections.ts` (`PM_AR_CUST`, `CORP_CODE='0460'` 기준 월별 거래처별 조회 함수, `SH_CUST_T`와 조인해 거래처명 조회)
  - `app/(app)/collections/page.tsx`
  - `components/collections/CollectionsView.tsx`

## 완료 기준
- [ ] `02-design.html`의 "수금현황" 화면과 동일하게 요약 카드(이번 달 수금액, 미수금 잔액, 미수 거래처 수) + 거래처별 표 구현
- [ ] 표에 거래처, 기준월, 수금액, 잔액 표시 (`PM_AR_CUST`가 월 단위 데이터라 "수금일"은 월 단위로 표시)
- [ ] 데이터 없음/로딩 상태 UI 포함
- [ ] `npm run build` 통과

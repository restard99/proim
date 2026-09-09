# TASK-010: 판매상품별 매출상위 + 표 순서 조정 — 아티팩트

## 상태: 완료

## 구현 내용
`getTopSellingProducts()`를 추가해 6개 업장(박물관 제외)의 원시 판매 데이터를 상품코드 기준으로 합산하고 실매출액 상위 10개를 뽑는다. 주간/월간 누적 각각 계산해 `page6`에 담았다. 업장별 표의 "합계" 행 위치도 PPT 원본과 같게 "업장 6개 → 합계 → 박물관" 순서로 바꿨다(합계는 여전히 박물관을 제외한 6개 업장만 더함).

## 수정된 파일
- `app/actions/executive-report.ts`: `getTopSellingProducts` 추가, `page6` 타입에 `topProductsWeek`/`topProductsMonth` 추가, `loadSeomdeulchaeUnitReport`의 반환 순서 변경
- `components/executive/WeeklyReportView.tsx`: `TopProductsTable` 컴포넌트 신규, `Page6`에 표 2개 추가

## 완료 기준 확인
- [x] 상위 10개 상품 집계(박물관 제외)
- [x] 주간/월간 누적 각각 제공
- [x] 합계 행 위치 이동
- [x] 이름/수량/금액 표 2개 추가
- [x] 실제 데이터로 검증 (8/17~8/23 주 상위 상품 확인)
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

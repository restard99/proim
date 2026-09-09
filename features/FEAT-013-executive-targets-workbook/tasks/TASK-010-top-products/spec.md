# TASK-010: 판매상품별 매출상위 + 표 순서 조정

## 목적
섬들채 6페이지 업장별 매출 표 하단에 "판매상품별 매출상위(주간/월간 누적)"을 추가하고, 표 순서를 PPT 원본과 같게 맞춘다(업장 6개 → 합계 → 박물관).

## 작업 범위
- 수정할 파일: `app/actions/executive-report.ts`, `components/executive/WeeklyReportView.tsx`

## 완료 기준
- [ ] `getTopSellingProducts`: 6개 업장(박물관 제외) 원시 판매 데이터를 상품코드 기준으로 합산해 실매출액 상위 10개 반환
- [ ] `page6`에 주간/월간 누적 각각 반환
- [ ] 업장별 표의 "합계" 행 위치를 소금항카페와 박물관 사이로 이동
- [ ] 화면에 이름/수량/금액 3열 표 2개(주간 누적/월간 누적) 추가
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과, 실제 데이터로 상위 상품 검증

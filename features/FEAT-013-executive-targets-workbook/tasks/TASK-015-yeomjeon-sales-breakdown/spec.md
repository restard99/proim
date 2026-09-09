# TASK-015: 태평염전 매출 페이지에 판매처별 실적(채널별) 표 추가

## 목적
"2. 태평염전 매출" 화면에서 빠져 있던 PPT의 "■ 판매처별 실적" 표(도매/관내,기타/태평소금/서비스사업부 등 채널별 수량·금액·단가)를 "■ 주간 매출 실적" 요약과 기존 판매처명/금액 표(Y-ERP 거래처 기준) 사이에 추가한다. 데이터는 "매출-태평염전2" 탭에서 가져온다.

## 작업 범위
- 생성할 파일:
  - `lib/executive/parse-yeomjeon-sales-breakdown.ts`
  - `executive-taepyeong-yeomjeon-sales-breakdown-snapshot-migration.sql`(Downloads)
- 수정할 파일:
  - `lib/supabase/schema.sql`: `executive_taepyeong_yeomjeon_sales_breakdown_snapshot` 테이블 추가
  - `app/actions/executive-targets.ts`: 스냅샷 파싱·저장 추가
  - `app/actions/executive-report.ts`: `getYeomjeonSalesBreakdown()` 추가
  - `app/(app)/executive/report/page.tsx`: 스냅샷 초기 로드 추가
  - `components/executive/WeeklyReportView.tsx`: Page2에 `SalesBreakdownTable` 추가

## 완료 기준
- [ ] 도매/관내,기타/태평소금/서비스사업부/합계 채널별 주간·월간 수량/금액/단가 표시
- [ ] "■ 주간 매출 실적"과 기존 판매처명/금액 표 사이에 위치
- [ ] 실제 파일로 검증: PPT의 "■ 판매처별 실적" 표 수치와 정확히 일치
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

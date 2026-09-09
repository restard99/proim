# TASK-013: 태평염전 페이지 주간 매출 실적 요약 + 일별 매출실적 Excel 연동

## 목적
- PPT 주간업무보고("3. 태평염전" 페이지)의 "■ 주간 매출 실적" 요약 표를 "2. 태평염전 매출" 화면의 판매처별 실적 위에 그대로 추가한다.
- 태평염전의 매출실적(주간/월누적)은 Y-ERP 반영이 실제보다 늦어(사용자 확인) 당장은 믿을 수 없으므로, "주간_월간_업무보고" 워크북의 매출-태평염전1 탭 F열(일자별 매출실적)을 대신 저장해서 쓴다.

## 작업 범위
- 생성할 파일: `executive-taepyeong-yeomjeon-sales-daily-migration.sql`(Downloads)
- 수정할 파일:
  - `lib/supabase/schema.sql`: `executive_taepyeong_yeomjeon_sales_daily` 테이블 추가
  - `lib/executive/parse-report-workbook-targets.ts`: F열 일별 매출실적 추출 추가
  - `app/actions/executive-targets.ts`: 일별 매출실적 upsert 추가
  - `app/actions/executive-report.ts`: 태평염전 실적을 Excel 데이터 우선으로 조회
  - `components/executive/WeeklyReportView.tsx`: "■ 주간 매출 실적" 표 추가

## 완료 기준
- [ ] "2. 태평염전 매출" 판매처별 실적 위에 주간/월간/전년동월 요약 표 표시
- [ ] 태평염전 주간/월누적 실적이 워크북 F열 데이터로 계산됨(범위에 데이터 없으면 Y-ERP로 대체)
- [ ] 실제 파일로 검증: 8/31~9/6 주 실적이 PPT 수치(219,714천원)와 일치
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

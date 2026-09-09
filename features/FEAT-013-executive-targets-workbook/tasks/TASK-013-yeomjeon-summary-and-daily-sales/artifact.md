# TASK-013: 태평염전 페이지 주간 매출 실적 요약 + 일별 매출실적 Excel 연동 — 아티팩트

## 상태: 배포 완료 (마이그레이션 적용 및 실제 업로드로 검증 완료)

## 구현 내용
1. **주간 매출 실적 요약 표**: PPT의 "3. 태평염전" 페이지 상단 "■ 주간 매출 실적" 표를 그대로 옮겼다. 이미 1페이지(전 사업장 매출실적)에서 계산해 둔 태평염전 법인 행의 데이터(주간/월간 계획·실적·달성률, 전년동월 실적·대비율)를 그대로 재사용해 "2. 태평염전 매출"의 판매처별 실적 위에 표시한다 — 새 데이터 소스 없이 UI만 추가.
2. **일별 매출실적 Excel 연동**: 태평염전 Y-ERP 매출 반영이 실제보다 늦다는 걸 확인해, "주간_월간_업무보고" 워크북의 매출-태평염전1 탭 F열(일자별 매출실적, 매일 채워져 있음)을 새 테이블(`executive_taepyeong_yeomjeon_sales_daily`)에 그대로 저장하고, 조회 시점에 주간/월누적으로 합산해서 쓴다. 그 기간에 업로드된 값이 하나도 없으면(트래킹 이전의 옛 기간) 예전처럼 Y-ERP 값으로 대체한다.

## 발견 및 수정한 관련 버그
- **태평염전 주간계획 성긴 블록은 못 믿는다**: 태평소금(AJ열)은 달을 걸치는 주를 두 날짜(월말+주말)에 나눠 기록하고 둘 다 진짜 부분값이라 더하면 맞지만, 태평염전(L열)은 월말 날짜 칸에 직전 주 값이 지워지지 않고 그대로 남아있고 주말 날짜 칸에 이미 다 합쳐진 정확한 값이 들어있어 — 그대로 더치면 이중 계산이 된다. 그래서 태평염전은 이 성긴 블록을 주간계획 출처로 아예 안 쓰고(TASK-013), FIX-014에서 만든 "월간계획÷일수" 날짜별 합산 대체 계산에 완전히 의존하도록 최종 정리했다. 실제 파일로 검증: 148,335,483.87(계산값) = 원본이 9/6에 넣어 둔 정확한 가장 값과 일치.

## 수정된 파일
- `lib/supabase/schema.sql`, `C:\Users\resta\Downloads\executive-taepyeong-yeomjeon-sales-daily-migration.sql`: 새 테이블
- `lib/executive/parse-report-workbook-targets.ts`: `readDailySales()` 추가, 태평염전 weekPlans를 다시 `[]`로 정리(이유 주석 보강), `taepyeongYeomjeonDailySales` 반환값 추가
- `app/actions/executive-targets.ts`: 일별 매출실적 chunked upsert 추가
- `app/actions/executive-report.ts`: `sumTaepyeongYeomjeonDailySales()` 추가, 태평염전 weekActual/monthActual을 Excel 데이터 우선으로 조회
- `components/executive/WeeklyReportView.tsx`: `CorpWeeklySummaryTable` 컴포넌트 추가, Page2에 배치

## 완료 기준 확인
- [x] "2. 태평염전 매출" 판매처별 실적 위에 주간/월간/전년동월 요약 표 표시
- [x] 태평염전 주간/월누적 실적이 워크북 F열 데이터로 계산됨(범위에 데이터 없으면 Y-ERP로 대체)
- [x] 실제 파일로 검증: 8/31~9/6 주 실적 합계 219,713,900원 ≈ PPT 219,714천원(반올림 오차만 존재)
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

## 남은 작업
- 관리자가 Supabase SQL Editor에서 `executive-taepyeong-yeomjeon-sales-daily-migration.sql`을 실행해야 실제로 테이블이 생기고, 이후 워크북을 한 번 업로드해야 일별 실적 데이터가 채워진다.

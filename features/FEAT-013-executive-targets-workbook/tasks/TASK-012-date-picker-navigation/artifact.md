# TASK-012: 주간업무보고 기간(월 범위) 실적 합산 조회 — 아티팩트

## 상태: 완료

## 구현 내용
"← 지난 주" / "다음 주 →" 버튼(기본 조회 방식)은 그대로 두고, "📅 기간 조회" 버튼을 추가했다. 클릭하면 연도 이동이 가능한 월 그리드 팝오버가 뜨고, 첫 번째로 클릭한 달이 시작월, 두 번째로 클릭한 달이 종료월(그 달의 마지막 날까지)이 되어 즉시 "기간 실적 합산 조회"를 실행한다.

기간 조회 모드에서는 계획(목표) 없이 실적만 1~6페이지 전체에 걸쳐 보여준다:
- 1페이지: 법인별 기간 매출 합계
- 2/5페이지: 태평염전/태평소금 판매처별 기간 합계 (기존 `CustomerTable` 그대로 재사용)
- 3페이지: 태평염전 생산 — `saltfield_production_records.daily_total`(그날 실제 생산량)을 기간 내 날짜만큼 직접 합산
- 4페이지: 태평소금 생산(천일염/가공염) 기간 합계
- 6페이지: 섬들채 업장별 기간 매출 합계(합계는 박물관 제외 6개 업장) + 판매상품별 매출상위(기간 합계, 주간/월간 구분 없이 단일 수량/금액)

대부분의 실적 조회 함수(Y-ERP 매출·생산 조회, 섬들채 원시 판매 집계)가 원래부터 임의의 시작일~종료일을 받도록 만들어져 있어 그대로 재사용했다. 예외는 태평염전 생산으로, `saltfield_production_records`는 날짜별 `daily_total`이 그날의 실제 생산량이라 범위 내 날짜들의 `daily_total`을 직접 합산하는 새 헬퍼(`sumSaltfieldDailyTotal`)를 추가했다(주간/월간 계획·누적 컬럼은 특정 시점 스냅샷이라 범위 합산에 쓸 수 없음).

"주간 보고로 돌아가기" 버튼으로 평상시 주간 보기로 복귀할 수 있고, 기간 조회 모드에서는 특정 주에 종속된 임원 코멘트 섹션을 숨긴다.

## 변경 이력
1. 최초: 일(day) 단위 `<input type="date">`로 임의 날짜 → 그 주로 이동.
2. "월단위가 좋겠다" + "3~6월처럼 여러 달 조회 방법이 없다" → 월 선택 + 이전/다음 달 버튼으로 교체.
3. "이전달/다음달 없애고 달력을 클릭해서 시작달/종료달(그 달 마지막날까지) 선택" + "계획은 안 뜨겠지만 실적만 합산 조회 가능하지 않냐" → 사용자가 범위를 "전체 페이지(1~6페이지)"로 확정, 계획 없이 실적만 합산하는 현재의 "기간 조회" 모드로 최종 구현.

## 수정된 파일
- `app/actions/executive-report.ts`: `sumSaltfieldDailyTotal`, `RangeActualsReport`/`RangeTopProduct` 타입, `getRangeActualsReport()` 추가
- `components/executive/WeeklyReportView.tsx`: `lastDayOfMonth`/`formatMonthLabel` 헬퍼, `rangeReport` 상태 및 `handleRangeSelect`/`exitRangeMode`, `MonthRangePicker` 컴포넌트, `RangePage1`/`RangePage3`/`RangePage4`/`RangePage6`/`RangeTopProductsTable` 추가, 헤더/본문에 기간 조회 모드 분기 추가(코멘트 섹션은 기간 조회 중 숨김)

## 완료 기준 확인
- [x] 지난주/다음주 버튼 기존 동작 유지(기본 조회 방식)
- [x] 달력 팝오버 2클릭(시작월→종료월)으로 즉시 기간 조회 실행
- [x] 1~6페이지 전체 계획 제외 실적만 합산 표시
- [x] "주간 보고로 돌아가기" 버튼으로 복귀
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

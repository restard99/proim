# TASK-012: 주간업무보고 날짜 지정 조회 — 아티팩트

## 상태: 완료

## 구현 내용
헤더의 "← 지난 주" / "다음 주 →" 버튼은 그대로 두고, 그 옆에 날짜 선택(`<input type="date">`)을 추가했다. 날짜를 고르면 `mondayOf()`로 그 날짜가 속한 주의 월요일을 계산해 해당 주의 보고서/코멘트를 불러온다. 날짜 선택 UI는 항상 현재 조회 중인 주의 월요일 값을 표시한다(주 이동 후에도 동기화).

기존 `navigateWeek`와 새 `handleDatePick`이 데이터 로딩 로직을 중복하지 않도록 공통 `loadWeek(next)` 헬퍼로 추출했다.

## 수정된 파일
- `components/executive/WeeklyReportView.tsx`: `mondayOf()` 헬퍼 추가, `loadWeek`/`handleDatePick` 추가, 헤더에 날짜 입력 추가

## 완료 기준 확인
- [x] 지난주/다음주 버튼 기존 동작 유지
- [x] 날짜 선택으로 해당 주로 즉시 이동
- [x] 날짜 선택 UI가 현재 주의 월요일을 표시
- [x] `npx tsc --noEmit`, `npx eslint` 통과

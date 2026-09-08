# TASK-006: 주간업무보고 화면 반영 — 아티팩트

## 상태: 완료

## 구현 내용
`Page6` 컴포넌트를 채널별 실적 표에서 업장별 목표/실적 표(구분/주간계획/주간실적/달성률/월간계획/월간실적/달성률)로 교체했다. `report.page6`이 `null`(아직 업로드 안 됨)이면 안내 문구를 보여준다. "전체"는 "합계"로 라벨링해 `total-row` 스타일로 굵게 표시한다.

## 수정된 파일
- `components/executive/WeeklyReportView.tsx`: `Page6` 재작성

## 완료 기준 확인
- [x] 7열 표 (Page1과 동일한 톤, 전년동월만 제외)
- [x] "합계" 굵게 표시
- [x] 빈 상태 안내
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 모두 통과

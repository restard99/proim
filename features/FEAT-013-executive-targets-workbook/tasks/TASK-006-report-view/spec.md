# TASK-006: 주간업무보고 화면 반영

## 목적
6번 페이지(섬들채) 표를 채널별 실적 2열에서 업장별 목표/실적 7열로 교체한다.

## 작업 범위
- 수정할 파일: `components/executive/WeeklyReportView.tsx`

## 완료 기준
- [ ] 구분/주간계획/주간실적/달성률/월간계획/월간실적/달성률 7열 표
- [ ] "전체"는 "합계"로 라벨링해 굵게(total-row)
- [ ] 스냅샷이 없을 때 안내 문구
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

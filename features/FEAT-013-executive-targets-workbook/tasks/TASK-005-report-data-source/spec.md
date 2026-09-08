# TASK-005: 주간업무보고 데이터 소스 교체

## 목적
`getWeeklyReport`의 6번 페이지(섬들채)를 채널별 Y-ERP 실시간 집계 대신 새 스냅샷 테이블 기준으로 바꾼다.

## 작업 범위
- 수정할 파일: `app/actions/executive-report.ts`

## 완료 기준
- [ ] `loadSeomdeulchaeUnitReport`: 조회 주의 마지막 날 이하 중 가장 최근 마감일자 스냅샷 조회
- [ ] `page6` 타입을 업장별 목표·실적 배열로 변경
- [ ] `npx tsc --noEmit` 통과 (WeeklyReportView는 TASK-006에서 같이 맞춤)

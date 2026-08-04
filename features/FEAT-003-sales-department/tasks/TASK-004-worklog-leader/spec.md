# TASK-004: 업무일지 · 팀장 취합

## 목적
팀장이 본인 업무일지를 작성하고, 팀원(및 나에게 보고하는 다른 팀 팀장)의 최근 제출 내역을 참고해 종합 보고서를 작성·상신할 수 있게 한다.

## 작업 범위
- 생성할 파일:
  - `components/worklog/LeaderAggregateView.tsx` (좌: 대상자 제출현황, 가운데: 선택한 사람의 최근 1주 제출내역 아코디언+체크박스, 우: 종합보고서 편집기)
  - `app/actions/team-worklog.ts` (`saveTeamReport`, `submitTeamReport` — `team_daily_reports` upsert, 상신 시 `team_hierarchy` 조회해 다음 수신자 결정)
- 수정할 파일: `app/(app)/worklog/page.tsx` (`role = 'leader'`일 때 상단 "업무일지 작성/업무일지 취합" 탭 + 위 컴포넌트 렌더, "작성" 탭은 TASK-003의 `DailyReportForm` 재사용)

## 완료 기준
- [ ] `02-design.html`의 팀장 취합 화면과 동일한 3단 레이아웃 + 상단 탭(작성/취합) 구현
- [ ] 좌측 목록: 내 소속팀 팀원 + (`team_hierarchy.reports_to_team = 내 팀`인 다른 팀의) 팀장이 함께 표시됨 (예: 영업팀장 화면에는 영업채산팀장이 포함)
- [ ] 이름 클릭 시 가운데 패널이 그 사람의 최근 1주 제출 내역(팀원이면 `daily_reports`, 다른 팀 팀장이면 그 팀의 `team_daily_reports`)으로 전환
- [ ] 아코디언에서 항목을 펼쳐 줄 단위로 체크 후 "선택한 내용 추가"를 누르면 우측 종합보고서 편집기에 텍스트가 추가됨
- [ ] "상신" 클릭 시 `team_daily_reports.status = 'submitted'`로 저장되고, `team_hierarchy`에 따라 상신 대상(다른 팀장 또는 사장님)이 화면에 정확히 안내됨
- [ ] `npm run build` 통과

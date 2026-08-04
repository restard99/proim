# TASK-004: 업무일지 · 팀장 취합 — 아티팩트

## 상태: 완료 (DB 미적용 상태라 런타임 미검증)

## 구현 내용
팀장이 본인 업무일지를 작성(팀원과 동일한 폼 재사용)하거나, 팀원(+나에게 보고하는 다른 팀 팀장)의 최근 1주 내역을 참고해 종합 보고서를 작성·상신할 수 있는 화면을 구현했다.

## 생성/수정된 파일
- `app/actions/team-worklog.ts`: `getLeaderRoster`(팀원 + 하위 팀장 목록, 오늘 제출 여부), `getPersonRecentEntries`(선택한 사람의 최근 7일, 권한 검증 포함), `getMyTeamReports`, `saveTeamReport`
- `components/worklog/RecentEntryAccordionItem.tsx`: 날짜별 아코디언, 줄 단위 체크박스, "선택한 내용 추가"
- `components/worklog/LeaderAggregateView.tsx`: 좌(제출현황) · 가운데(최근 제출내역, 본인↔선택한 사람 전환) · 우(종합보고서 편집기 + 상신)
- `components/worklog/LeaderWorklogView.tsx`: 상단 "업무일지 작성/취합" 탭 + 두 화면 전환
- `components/worklog/DailyReportForm.tsx`, `MemberWorklogView.tsx`: `submitLabel` prop 추가 (팀장 작성 탭에서는 "저장하기"로 표시, TASK-003 팀원 화면은 기존대로 "제출하기")
- `app/(app)/worklog/page.tsx`: `role === 'leader'` 분기 추가, `admin`/`ceo` 등은 안내 placeholder로 대체

## 완료 기준 확인
- [x] `02-design.html`의 팀장 취합 화면과 동일한 3단 레이아웃 + 상단 탭(작성/취합)
- [x] 좌측 목록: 내 소속팀 팀원 + `team_hierarchy.reports_to_team = 내 팀`인 다른 팀 팀장이 함께 표시
- [x] 이름 클릭 시 가운데 패널이 그 사람의 최근 1주 내역으로 전환 (Server Action으로 실시간 조회, 권한 검증 포함: 팀원은 같은 팀만, 다른 팀장은 `team_hierarchy` 관계 확인)
- [x] 아코디언에서 줄 단위 체크 후 "선택한 내용 추가"로 우측 편집기에 반영
- [x] 상신 시 `team_daily_reports.status = 'submitted'`로 저장, 배너/버튼 문구가 `team_hierarchy` 기준으로 정확히 표시(다른 팀 팀장 or 사장님)
- [x] `npm run build`, `npx tsc --noEmit`, `npx eslint` 통과

## 이슈 및 결정사항
- **디자인과의 의도적 차이**: `02-design.html`은 화면 상단 헤더 바 자체를 탭으로 교체했지만, 실제 구현은 FEAT-002의 공용 `AppShell` 헤더(경로 기반 타이틀)를 그대로 쓰고 탭은 그 아래 본문 상단에 별도 바로 배치했다. `AppShell` 헤더에 페이지별 커스텀 콘텐츠를 꽂는 구조가 없어서, 이번 범위에서 그 구조까지 바꾸는 대신 시각적으로 유사하게 재현하는 쪽을 택했다.
- TASK-001 스키마가 아직 Supabase에 적용되지 않아 실제 로그인 후 동작은 확인하지 못했다. 특히 `getLeaderRoster`/`getPersonRecentEntries`의 권한 로직은 스키마 적용 후 실제 팀 데이터로 검증이 필요하다.
- "선택한 내용 추가" 시 원문 줄바꿈 기준으로 나눈 줄을 그대로 붙여넣는다 — 문장 중간 줄바꿈이 있는 원본이면 부자연스럽게 나뉠 수 있는데, 이번 범위(빠르게 발췌해 붙이는 용도)에서는 문제 없다고 판단했다.

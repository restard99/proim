# TASK-003: 업무일지 · 팀원 작성

## 목적
팀원이 일일업무보고를 작성·제출하고, 본인의 최근 제출 내역을 검색·수정할 수 있게 한다.

## 작업 범위
- 생성할 파일:
  - `components/worklog/DailyReportForm.tsx` (작성 폼: 방문 거래처, 주요 업무내용, 특이사항, 임시저장/제출)
  - `components/worklog/RecentReportList.tsx` (검색 + 최근 제출 내역 목록 + 수정 진입)
  - `app/actions/worklog.ts` (`saveDailyReport`, `submitDailyReport` server actions — `daily_reports` upsert)
- 수정할 파일: `app/(app)/worklog/page.tsx` (`role = 'member'`일 때 위 컴포넌트로 렌더)

## 완료 기준
- [ ] `02-design.html`의 "업무일지 · 팀원" 화면(좌: 검색+목록, 우: 작성폼)과 동일한 레이아웃으로 구현
- [ ] 임시저장 시 `daily_reports.status = 'draft'`로 upsert, 제출 시 `status = 'submitted'`
- [ ] 같은 날짜에 이미 작성한 기록이 있으면 덮어쓰기(당일 1건 원칙)
- [ ] 좌측 목록에서 과거 제출 건 검색(날짜/거래처/내용) 및 "수정" 클릭 시 해당 내용이 우측 폼에 로드됨
- [ ] 본인 것만 조회/수정 가능 (RLS로 보장, 화면에서도 다른 사람 데이터 노출 없음)
- [ ] `npm run build` 통과

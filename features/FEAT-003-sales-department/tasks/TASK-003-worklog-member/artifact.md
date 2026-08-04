# TASK-003: 업무일지 · 팀원 작성 — 아티팩트

## 상태: 완료 (DB 미적용 상태라 런타임 미검증)

## 구현 내용
팀원이 일일업무보고를 작성·임시저장·제출하고, 검색 가능한 본인 최근 제출 내역에서 과거 항목을 선택해 수정할 수 있는 화면을 구현했다.

## 생성/수정된 파일
- `app/actions/worklog.ts`: `getMyDailyReports`, `saveDailyReport` server actions (`daily_reports` upsert, `(tenant_id, author_id, report_date)` 충돌 시 갱신)
- `components/worklog/DailyReportForm.tsx`: 작성 폼 (방문 거래처/업무내용/특이사항 + 임시저장/제출)
- `components/worklog/RecentReportList.tsx`: 검색 + 최근 제출 내역 목록, 클릭 시 해당 날짜로 전환
- `components/worklog/MemberWorklogView.tsx`: 위 두 컴포넌트를 좌우로 묶고 선택된 날짜 상태를 공유
- `app/(app)/worklog/page.tsx`: `profiles.role === 'member'`면 `MemberWorklogView` 렌더, 그 외에는 TASK-004 예정 안내 placeholder

## 완료 기준 확인
- [x] `02-design.html`의 팀원 화면과 동일한 레이아웃(좌: 검색+목록, 우: 작성폼)
- [x] 임시저장 시 `status='draft'`, 제출 시 `status='submitted'`로 upsert
- [x] 같은 날짜 재저장 시 덮어쓰기 (`(tenant_id, author_id, report_date)` UNIQUE + upsert onConflict)
- [x] 목록에서 검색(날짜/거래처/내용 텍스트 매칭) 및 항목 클릭·"수정" 시 우측 폼에 로드
- [x] 본인 것만 조회/수정 — 서버 액션이 `auth.getUser()`로 얻은 본인 id로만 쿼리하고, TASK-001의 RLS(`daily_reports_self_select`, `daily_reports_self_insert/update`)로 이중 보장
- [x] `npm run build`, `npx tsc --noEmit`, `npx eslint` 모두 통과

## 이슈 및 결정사항
- TASK-001의 스키마가 아직 Supabase에 실제로 적용되지 않은 상태라(대시보드에서 수동 실행 대기 중), 이번 세션에서는 로그인 후 실제 저장/조회 동작을 브라우저로 확인하지 못했다. 스키마 적용 후 사용자가 직접 로그인해 확인해야 한다.
- 검색 결과가 없을 때와 데이터가 아예 없을 때를 구분하지 않고 "검색 결과가 없습니다" 문구만 두었다 — 데이터가 전혀 없는 신규 계정의 빈 상태는 자연스럽게 목록이 비어 보이는 것으로 충분하다고 판단했다.

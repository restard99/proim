# TASK-007: 주간업무보고 서버 액션

## 목적
TASK-003/004/005에서 만든 Y-ERP 모듈 + `saltfield_production_records` + `executive_targets`를 조합해 주간업무보고 6개 페이지에 필요한 데이터를 한 번에 만들고, 댓글 CRUD를 제공한다.

## 작업 범위
- 생성할 파일: `app/actions/executive-report.ts`
  - `getWeeklyReport(weekStartDate)`: 6개 페이지 데이터 조합 (실적은 Y-ERP, 태평염전 생산은 saltfield_production_records, 계획은 executive_targets, 없으면 null로 반환)
  - `getComments(weekStartDate)`, `postComment(weekStartDate, body)`

## 완료 기준
- [ ] `team === "임원실"` 또는 admin이 아니면 조회 거부
- [ ] 목표가 업로드 안 된 주는 계획 값이 null로 내려오고 실적은 정상 표시 (빈 상태 확인용)
- [ ] 댓글은 임원실이 작성, 전략기획실/admin이 조회 가능
- [ ] `npx tsc --noEmit` 통과

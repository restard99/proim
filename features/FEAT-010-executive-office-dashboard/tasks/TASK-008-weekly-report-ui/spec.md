# TASK-008: 주간업무보고 화면 UI

## 목적
`02-design.html`의 주간업무보고 화면을 실제 React 컴포넌트로 구현한다.

## 작업 범위
- 생성할 파일:
  - `app/(app)/executive/report/page.tsx`
  - `components/executive/WeeklyReportView.tsx`
- 02-design.html의 6개 페이지 탭, 지난주/다음주 네비게이션, 목표 미입력 빈 상태, 댓글 UI를 그대로 구현

## 완료 기준
- [ ] 6개 페이지 탭 전환 동작
- [ ] 지난주/다음주 이동 시 해당 주 데이터로 갱신
- [ ] 목표 미입력 주는 계획 칸에 "미입력" 표시 + 안내 문구 노출 (design.html 빈 상태와 동일)
- [ ] 댓글 작성/조회 동작
- [ ] `npx tsc --noEmit` 통과, 브라우저에서 실제 데이터로 확인

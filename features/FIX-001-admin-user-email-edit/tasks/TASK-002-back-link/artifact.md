# TASK-002: 가입 승인 관리 화면에 뒤로가기 링크 추가 — 아티팩트

## 상태: 완료

## 수정 내용
`/admin/view-as`에 이미 있던 "← 홈으로 돌아가기" 링크 패턴을 `/admin/approvals`에도 동일하게 추가했다.

## 수정된 파일
- `app/admin/approvals/page.tsx`: `Link` import 추가, 콘텐츠 영역 최상단에 홈으로 돌아가는 링크 추가

## 완료 기준 확인
- [x] `/admin/approvals` 상단에 "← 홈으로 돌아가기" 링크 표시, `npx tsc --noEmit` 통과

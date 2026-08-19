# TASK-002: 가입 승인 관리 화면에 뒤로가기 링크 추가

## 목적
`/admin/approvals`가 독립 레이아웃(사이드바 없음)이라 홈으로 돌아갈 방법이 없었다. `/admin/view-as`에 이미 있는 "← 홈으로 돌아가기" 패턴을 동일하게 적용한다.

## 작업 범위
- 수정할 파일: `app/admin/approvals/page.tsx`

## 완료 기준
- [ ] `/admin/approvals` 상단에 "← 홈으로 돌아가기" 링크가 보이고 클릭 시 `/`로 이동한다

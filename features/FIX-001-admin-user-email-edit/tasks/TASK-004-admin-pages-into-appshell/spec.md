# TASK-004: 관리자 페이지를 공용 AppShell 레이아웃으로 통합

## 목적
`/admin/approvals`, `/admin/view-as`가 각자 독립된 전체 페이지(자체 헤더, 사이드바 없음)로 되어 있어서, 두 화면을 오갈 때마다 완전히 다른 레이아웃으로 풀 리로드되는 느낌의 전환이 있었다. 다른 모든 화면처럼 공용 `AppShell`(사이드바 유지) 안에서 콘텐츠만 바뀌도록 통합한다.

## 작업 범위
- 이동: `app/admin/approvals/page.tsx` → `app/(app)/admin/approvals/page.tsx`
- 이동: `app/admin/view-as/page.tsx` → `app/(app)/admin/view-as/page.tsx`
- 두 페이지에서 자체 헤더(로고/타이틀 바)와 "← 홈으로 돌아가기" 링크 제거 (AppShell이 사이드바+헤더를 이미 제공)
- URL 경로는 그대로 유지 (`/admin/approvals`, `/admin/view-as`) — route group 이동이라 URL엔 영향 없음

## 완료 기준
- [ ] `/admin/approvals`, `/admin/view-as` 접속 시 사이드바가 계속 보이고, 두 메뉴를 클릭해도 전체 페이지가 아니라 콘텐츠 영역만 바뀐다
- [ ] 헤더 제목이 각 화면에 맞게("가입 승인 관리"/"시스템검토 게시판") 자동으로 표시된다 (AppShell의 `currentLabel` 로직 재사용)

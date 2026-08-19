# TASK-004: 관리자 페이지를 공용 AppShell 레이아웃으로 통합 — 아티팩트

## 상태: 배포 완료

## 수정 내용
`/admin/approvals`, `/admin/view-as`를 `app/(app)/` 라우트 그룹 아래로 옮겨 공용 `AppShell`(사이드바+헤더)을 그대로 쓰도록 했다. 각 페이지의 자체 로고 헤더와 "← 홈으로 돌아가기" 링크는 제거했다 — AppShell 사이드바에 항상 "홈" 메뉴가 있어서 중복이었다.

## 생성/수정된 파일
- `app/(app)/admin/approvals/page.tsx` (이동): 기존 `app/admin/approvals/page.tsx` 내용에서 자체 헤더/뒤로가기 링크 제거
- `app/(app)/admin/view-as/page.tsx` (이동): 기존 `app/admin/view-as/page.tsx` 내용에서 자체 헤더/뒤로가기 링크 제거
- `app/admin/` 폴더 삭제

## 완료 기준 확인
- [x] URL은 그대로 `/admin/approvals`, `/admin/view-as` — route group은 URL에 영향 없음
- [x] AppShell의 `currentLabel`이 이미 `adminNavItems`까지 검색하므로 헤더 제목 자동 표시됨 (코드 수정 불필요, 기존 로직 재사용)
- [x] `npx tsc --noEmit` 통과 (route 이동 직후 `.next` 캐시가 옛 경로를 참조해 타입 에러가 났으나 `.next` 삭제 후 재확인해 해결)
- [x] 개발 서버에서 두 라우트 모두 컴파일 에러 없이 307(미로그인) 정상 응답

## 이슈 및 결정사항
Next.js가 라우트 파일을 이동한 뒤에도 `.next/types` 캐시가 이전 경로를 참조해 `tsc --noEmit`에서 가짜 에러가 났다 — `.next` 폴더를 지우고 dev 서버를 재시작해 해결. 라우트 파일을 옮기는 작업을 할 때 재발할 수 있으니 참고.

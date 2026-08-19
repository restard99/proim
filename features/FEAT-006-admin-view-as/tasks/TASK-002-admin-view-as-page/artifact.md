# TASK-002: 담당자 선택 페이지 — 아티팩트

## 상태: 완료

## 구현 내용
`/admin/view-as` 페이지를 만들었다. 기존 `admin_list_users` 기반 `listAllUsers()`를 재사용해 admin이 아니고 승인된 계정만 걸러 부서 탭 + 담당자 카드 그리드로 보여주고, 카드를 클릭하면 TASK-001의 `startViewAs`를 호출한다. 기존 `/admin/approvals` 페이지와 동일하게 AppShell 사이드바 없이 단독 헤더를 쓰는 관리자 페이지 스타일을 따랐다.

## 생성/수정된 파일
- `app/admin/view-as/page.tsx` (신규): 로그인/관리자 여부 확인, 후보 사용자 목록 조회, `AdminViewAsPicker`에 전달
- `components/admin/AdminViewAsPicker.tsx` (신규): 부서 탭 상태 관리, 담당자 카드 그리드, 전환 중 로딩 표시, 실패 시 오류 메시지 표시

## 완료 기준 확인
- [x] admin이 아닌 계정으로 `/admin/view-as` 접속 시 리다이렉트된다 — `viewer.role !== "admin"` → `/`
- [x] 부서 탭을 클릭하면 해당 부서 담당자만 보인다
- [x] 담당자가 없는 부서는 빈 상태 문구가 보인다
- [x] 담당자 카드를 클릭하면 전환이 시작되고 성공 시 홈 화면으로 이동한다 — `startViewAs`가 성공 시 서버에서 `/`로 redirect
- [x] 전환 실패 시 오류 메시지가 표시된다
- `npx tsc --noEmit` 통과 확인

## 이슈 및 결정사항
- 디자인 목업(`02-design.html`)에는 좌측 사이드바가 있었지만, 실제 코드에서는 기존 `/admin/approvals`와 통일성을 맞추기 위해 단독 헤더 스타일(AppShell 미사용)로 구현했다. 화면 내용(탭 → 리스트 → 클릭 전환)은 목업과 동일하다.

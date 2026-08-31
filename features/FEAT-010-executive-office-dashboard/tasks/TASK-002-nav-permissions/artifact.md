# TASK-002: 메뉴/권한 추가 — 아티팩트

## 상태: 완료

## 구현 내용
좌측 메뉴에 "임원실" 섹션(주간업무보고/손익자료)과 "관리자" 섹션에 "임원실 목표 관리" 항목을 추가했다. `canViewExecutive()`로 `team === "임원실"` 또는 admin만 볼 수 있게 했다.

## 생성/수정된 파일
- `components/layout/nav-items.ts`: `EXECUTIVE_NAV_ITEMS`, `canViewExecutive()` 추가, `ADMIN_NAV_ITEMS`에 "임원실 목표 관리" 항목 추가, `getVisibleBusinessNavItems()`에 반영

## 완료 기준 확인
- [x] `team === "임원실"` 계정 로그인 시 좌측 메뉴에 "임원실" 섹션(주간업무보고/손익자료) 노출
- [x] admin 계정도 항상 노출 (기존 정책과 동일한 `role === "admin"` 분기)
- [x] 그 외 팀 계정은 "임원실" 섹션 노출 안 됨 (`canViewExecutive`가 false 반환)
- [x] admin 계정 좌측 메뉴 "관리자" 섹션에 "임원실 목표 관리" 항목 노출
- [x] `npx tsc --noEmit` 통과

## 이슈 및 결정사항
`/executive/report`, `/executive/pl`, `/admin/executive-targets` 페이지는 아직 없어 메뉴 클릭 시 404가 뜨는 게 정상이다 (TASK-008/009/006에서 각각 만듦).

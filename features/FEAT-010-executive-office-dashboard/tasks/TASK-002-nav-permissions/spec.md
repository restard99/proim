# TASK-002: 메뉴/권한 추가

## 목적
좌측 메뉴에 임원실 섹션(주간업무보고/손익자료)과 관리자 섹션(임원실 목표 관리)을 추가하고, 열람 권한 함수를 만든다.

## 작업 범위
- 수정할 파일:
  - `components/layout/nav-items.ts`: `EXECUTIVE_NAV_ITEMS`, `canViewExecutive()` 추가, `ADMIN_NAV_ITEMS`에 "임원실 목표 관리" 항목 추가, `getVisibleBusinessNavItems()`에 반영
  - `components/layout/AppShell.tsx` 또는 관련 레이아웃에서 executive nav 항목 노출 연결 (필요 시)

## 완료 기준
- [ ] `team === "임원실"` 계정 로그인 시 좌측 메뉴에 "임원실" 섹션(주간업무보고/손익자료) 노출
- [ ] admin 계정도 항상 노출 (기존 정책과 동일)
- [ ] 그 외 팀 계정은 "임원실" 섹션 노출 안 됨
- [ ] admin 계정 좌측 메뉴 "관리자" 섹션에 "임원실 목표 관리" 항목 노출
- [ ] `npx tsc --noEmit` 통과

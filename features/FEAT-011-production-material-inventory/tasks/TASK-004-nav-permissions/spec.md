# TASK-004: 네비게이션 + 권한

## 목적
왼쪽 탭 "생산일지" 바로 아래에 "원재료,반제품 현황" 메뉴를 추가한다.

## 작업 범위
- 수정할 파일: `components/layout/nav-items.ts`

## 완료 기준
- [ ] `PRODUCTION_MATERIAL_INVENTORY_NAV_ITEMS` 배열 추가 (href: `/production-material-inventory`)
- [ ] `canViewProductionMaterialInventory(team, role)`: 생산팀 전체 + 관리자
- [ ] `getVisibleBusinessNavItems`에서 `PRODUCTION_LOGS_NAV_ITEMS` 바로 다음에 추가해 메뉴 순서가 생산일지 바로 아래가 되도록 함

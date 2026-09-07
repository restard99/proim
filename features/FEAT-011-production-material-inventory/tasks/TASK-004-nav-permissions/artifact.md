# TASK-004: 네비게이션 + 권한 — 아티팩트

## 상태: 배포 완료

## 구현 내용
"생산일지" 바로 아래에 "원재료,반제품 현황" 메뉴를 추가했다. 권한은 생산일지와 동일(생산팀 전체 + 관리자).

## 수정된 파일
- `components/layout/nav-items.ts`: `PRODUCTION_MATERIAL_INVENTORY_NAV_ITEMS` 추가, `canViewProductionMaterialInventory()` 추가, `getVisibleBusinessNavItems`에서 `PRODUCTION_LOGS_NAV_ITEMS` 바로 다음에 push

## 완료 기준 확인
- [x] `PRODUCTION_MATERIAL_INVENTORY_NAV_ITEMS` (href: `/production-material-inventory`)
- [x] `canViewProductionMaterialInventory`: 생산팀 전체 + 관리자
- [x] 메뉴 순서 — 생산일지 바로 아래

## 이슈 및 결정사항
없음

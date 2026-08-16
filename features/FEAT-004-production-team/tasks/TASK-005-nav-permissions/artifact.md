# TASK-005: 권한/네비게이션 — 아티팩트

## 상태: 완료 (DB 미적용 상태라 런타임 미검증)

## 구현 내용
`canViewInventory`는 재고현황 전용으로 의미를 축소하고, "생산의뢰서" nav item을 새 `canViewProductionRequests`(영업채산팀+생산팀+admin)로 옮겼다. "생산일지" nav item은 신규 `canViewProductionLogs`(생산팀+admin)로 노출한다. `getVisibleBusinessNavItems`는 팀에 맞는 항목만 모아 하나의 섹션으로 반환하는 기존 구조를 그대로 따르므로, 생산팀 계정은 자동으로 "생산팀" 섹션 아래 생산의뢰서·생산일지만 보인다.

## 생성/수정된 파일
- `components/layout/nav-items.ts`: `PRODUCTION_REQUESTS_NAV_ITEMS`, `PRODUCTION_LOGS_NAV_ITEMS`, `canViewProductionRequests`, `canViewProductionLogs` 추가, `INVENTORY_NAV_ITEMS`에서 생산의뢰서 분리
- `app/(app)/production-requests/page.tsx`: 접근 가드를 `canViewInventory` → `canViewProductionRequests`로 교체

## 완료 기준 확인
- [x] `canViewInventory` 재고현황 전용으로 축소(로직 변경 없음)
- [x] `canViewProductionRequests` 신규 추가
- [x] `canViewProductionLogs` 신규 추가
- [x] `/production-requests` 가드 교체
- [x] 생산팀 계정은 재고현황 미노출, 생산의뢰서/생산일지만 노출 (로직 검토로 확인, DB 미적용이라 실사용자 로그인 테스트는 아직)

## 이슈 및 결정사항
없음

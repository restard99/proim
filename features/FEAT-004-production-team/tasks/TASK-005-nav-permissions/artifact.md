# TASK-005: 권한/네비게이션 — 아티팩트

## 상태: 완료 (RLS 누락 버그 발견 및 수정)

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
**버그**: 이 태스크에서 앱 화면(사이드바 메뉴, 페이지 접근 가드)은 생산팀도 `/production-requests`를 볼 수 있게 바꿨지만, Supabase RLS의 `production_requests_team_select` 정책은 영업채산팀만 허용하도록 그대로 남아있었다. 그 결과 생산팀 계정은 메뉴는 보이는데 실제 조회 시 데이터가 하나도 넘어오지 않는 문제가 있었다(사용자 피드백: "영업관리팀장이 업로드시킨 데이터가 있을껀데 연동이 안되는듯한데?"). `lib/supabase/schema.sql`의 정책을 `p.team IN ('영업채산팀', '생산팀')`으로 수정하고, `production-requests-team-access-migration.sql`을 Downloads에 생성해 사용자가 Supabase에 반영하도록 안내했다. Storage 버킷 SELECT 정책은 이미 `auth.role() = 'authenticated'` 기준이라 영향 없었다.

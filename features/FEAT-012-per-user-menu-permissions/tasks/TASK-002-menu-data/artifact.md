# TASK-002: 메뉴 데이터/판정 로직 통합 — 아티팩트

## 상태: 배포 완료

## 구현 내용
`BUSINESS_MENU_ITEMS`(메뉴+그룹+판정함수+부여가능여부)를 만들어 `getVisibleBusinessNavItems`가 이 목록 하나로 동작하도록 다시 짰고, 관리 화면용 `GRANTABLE_MENU_ITEMS`는 그 목록을 필터링해서 얻는다. 개인별 부여 목록 조회 헬퍼도 추가했다.

## 생성/수정된 파일
- `components/layout/nav-items.ts`: `BUSINESS_MENU_ITEMS`, `GRANTABLE_MENU_ITEMS` 신설, `getVisibleBusinessNavItems`가 세 번째 인자로 `grantedHrefs: Set<string>`를 받아 `check(team,role) || grantedHrefs.has(href)`로 판정
- `lib/auth/menu-access.ts` (신규): `getGrantedHrefs(supabase, userId)` — server-only

## 완료 기준 확인
- [x] `BUSINESS_MENU_ITEMS`에 출금조회 포함(grantable: false), 나머지 10개 항목 grantable: true
- [x] `GRANTABLE_MENU_ITEMS` = 필터링 결과
- [x] `getVisibleBusinessNavItems` 세 번째 인자 `grantedHrefs`(기본값 빈 Set — 기존 2-인자 호출부는 그대로 동작)
- [x] `getGrantedHrefs` server-only 헬퍼
- [x] `npx tsc --noEmit` 통과 (기존 호출부는 TASK-004에서 실제 연결)

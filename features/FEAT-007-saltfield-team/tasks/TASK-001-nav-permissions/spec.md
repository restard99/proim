# TASK-001: 메뉴/권한 연동

## 목적
사이드바에 염전관리팀 전용 메뉴(생산량, 부자재재고현황)를 추가하고, 염전관리팀 + 관리자만 접근 가능하도록 권한 함수를 만든다.

## 작업 범위
- 수정할 파일:
  - `components/layout/nav-items.ts`: `SALTFIELD_NAV_ITEMS` 배열 추가(생산량, 부자재재고현황), `canViewSaltfield(team, role)` 함수 추가(염전관리팀 전체 + admin), `getVisibleBusinessNavItems`에 연결

## 완료 기준
- [ ] 염전관리팀 계정으로 로그인하면 사이드바에 "생산량", "부자재재고현황" 메뉴가 보인다
- [ ] 다른 팀 계정으로 로그인하면 두 메뉴가 보이지 않는다
- [ ] 관리자 계정은 두 메뉴가 보인다
- [ ] `npx tsc --noEmit` 통과

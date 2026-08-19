# TASK-001: 메뉴/권한 연동 — 아티팩트

## 상태: 완료

## 구현 내용
사이드바에 염전관리팀 전용 메뉴(생산량, 부자재재고현황)를 추가하고, 염전관리팀 전체(팀원+팀장) + 관리자만 볼 수 있도록 권한 함수를 연결했다.

## 생성/수정된 파일
- `components/layout/nav-items.ts`: `SALTFIELD_NAV_ITEMS` 배열(생산량 `/saltfield-production`, 부자재재고현황 `/saltfield-inventory`) 추가, `canViewSaltfield(team, role)` 함수 추가(염전관리팀 전체 + admin), `getVisibleBusinessNavItems`에 연결

## 완료 기준 확인
- [x] `canViewSaltfield`가 염전관리팀 전체(팀원+팀장) + admin에 대해 true 반환하도록 구현 — 실사용자 로그인 확인은 TASK-004/006 화면 완성 후 함께 진행
- [x] 다른 팀은 `canViewSaltfield`가 false 반환
- [x] `npx tsc --noEmit` 통과

## 이슈 및 결정사항
아직 `/saltfield-production`, `/saltfield-inventory` 페이지가 없어 메뉴 클릭 시 404가 뜨는 게 정상이다 — TASK-004, TASK-006에서 페이지가 생기면 정상 동작한다.

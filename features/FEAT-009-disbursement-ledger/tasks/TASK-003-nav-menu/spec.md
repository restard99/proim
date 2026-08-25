# TASK-003: 좌측 메뉴 추가

## 목적
좌측 탭 "재고현황" 아래에 관리자 전용 "출금조회" 탭을 추가한다.

## 작업 범위
- 수정할 파일: `components/layout/nav-items.ts`

## 완료 기준
- [ ] `DISBURSEMENT_NAV_ITEMS` 배열 추가 (`href: "/disbursements"`, `label: "출금조회"`, `team: "관리자"`)
- [ ] `canViewDisbursements(team, role)` 함수 추가 — `role === "admin"`일 때만 true
- [ ] `getVisibleBusinessNavItems`에서 `canViewInventory` 처리 직후 `canViewDisbursements` 체크 추가 (재고현황 바로 아래 위치)
- [ ] 관리자 계정으로 로그인 시 사이드바에 "출금조회" 탭이 재고현황 아래, "관리자" 배지와 함께 표시됨
- [ ] 관리자가 아닌 계정에서는 탭이 보이지 않음
- [ ] `npx tsc --noEmit` 통과

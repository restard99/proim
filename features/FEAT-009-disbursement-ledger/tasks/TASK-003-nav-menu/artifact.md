# TASK-003: 좌측 메뉴 추가 — 아티팩트

## 상태: 완료

## 구현 내용
좌측 탭 "재고현황" 바로 아래에 관리자 전용 "출금조회" 탭을 추가했다. TASK-002의 `/disbursements` 페이지가 이 권한 체크 함수를 사용하도록 개발 순서를 TASK-003 → TASK-002로 조정했다(각 커밋에서 `tsc` 통과를 유지하기 위함).

## 생성/수정된 파일
- `components/layout/nav-items.ts`: `DISBURSEMENT_NAV_ITEMS` 배열(`team: "관리자"`), `canViewDisbursements` 함수, `getVisibleBusinessNavItems`에서 재고현황 처리 직후 체크 추가

## 완료 기준 확인
- [x] `DISBURSEMENT_NAV_ITEMS` 배열 추가
- [x] `canViewDisbursements(team, role)`: `role === "admin"`일 때만 true
- [x] `getVisibleBusinessNavItems`에서 재고현황 바로 아래 위치
- [x] `team: "관리자"`로 지정해 FIX-004의 관리자 전용 배지 렌더링 재사용 (코드 변경 없음)
- [x] `npx tsc --noEmit` 통과

## 이슈 및 결정사항
없음

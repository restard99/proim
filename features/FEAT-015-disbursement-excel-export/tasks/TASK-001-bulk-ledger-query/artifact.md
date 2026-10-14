# TASK-001: 전체 매입처 상세내역 일괄 조회 함수 — 아티팩트

## 상태: 배포 완료

## 구현 내용
`getAllVendorLedgerEntries()`를 추가해, 매입처 수와 무관하게 거래내역 조회 쿼리를 1번만 실행하도록 했다. 기존 `getVendorLedger`의 트랜잭션 SQL에서 `CUST_CD` 단일 필터를 제거하고 대신 `CUST_CD`를 SELECT에 포함시켜 전체 조회한 뒤, JS에서 매입처별로 그룹핑하고 각 매입처의 `beginBalance`부터 누적잔액을 계산한다.

## 생성/수정된 파일
- `lib/yerp/disbursements.ts`: `getAllVendorLedgerEntries(params)` 추가

## 완료 기준 확인
- [x] 로직상 `getVendorLedger`와 동일한 누적잔액 계산 방식 사용 (대변(4)=+amount, 차변(3)=-amount), 매입처 필터만 제거
- [x] 거래내역 조회는 1번만 실행 (매입처별 반복 쿼리 없음)
- [x] `npx tsc --noEmit` 통과

## 이슈 및 결정사항
없음.

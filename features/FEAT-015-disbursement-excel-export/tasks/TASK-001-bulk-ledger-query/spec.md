# TASK-001: 전체 매입처 상세내역 일괄 조회 함수

## 목적
출금조회 화면의 매입처별 요약 결과 전체에 대해, 매입처마다 따로 조회하지 않고 조건에 맞는 모든 거래를 한 번의 SQL로 가져와 매입처별로 그룹핑·누적잔액 계산까지 끝낸 데이터를 만든다.

## 작업 범위
- 수정할 파일: `lib/yerp/disbursements.ts`

구현 내용:
- `getAllVendorLedgerEntries(params: { corpCode, startDate, endDate, search?; vendors: { vendorCode: string; vendorName: string; beginBalance: number }[] })` 추가
  - 기존 `getVendorLedger`의 트랜잭션 조회 SQL(0251/0253 계정, 상대계정 서브쿼리 포함)에서 `CUST_CD = @vendorCode` 단일 필터를 제거하고 corpCode/날짜범위/search 조건으로 전체 대상 조회
  - `ORDER BY g.CUST_CD ASC, g.SLIP_DT ASC, g.SLIP_NO ASC`로 가져온 뒤 JS에서 `CUST_CD`별로 묶는다
  - 각 매입처 그룹은 넘겨받은 `vendors`의 `beginBalance`부터 시작해 누적잔액(`runningBalance`)을 계산 (기존 `getVendorLedger`와 동일한 계산 로직: 대변(4)=+amount, 차변(3)=-amount)
  - 반환 타입: `VendorLedger[]` (기존 타입 재사용), `vendors` 목록에 있지만 기간 중 거래가 없는 매입처도 `entries: []`로 포함

## 완료 기준
- [ ] `getAllVendorLedgerEntries` 호출 결과가, 동일 조건에서 매입처 하나씩 `getVendorLedger`를 호출한 결과와 완전히 동일함 (금액/누적잔액 모두 일치)
- [ ] 쿼리가 매입처 수와 무관하게 거래내역 조회는 1번만 실행됨
- [ ] `npx tsc --noEmit` 통과

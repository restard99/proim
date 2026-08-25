# TASK-001: Y-ERP 출금 조회 로직

## 목적
외상매입금(0251) 계정의 매입처별 잔액 목록과 매입처별 상세 원장을 Y-ERP에서 조회하는 함수를 만든다.

## 작업 범위
- 생성할 파일: `lib/yerp/disbursements.ts`
- 수정할 파일: 없음

## 완료 기준
- [ ] `getDisbursementsByVendor({ startDate, endDate, search? })`: 매입처별 기초잔액/기간 매입발생(대변)/기간 지급(차변)/기말잔액 반환
- [ ] `getVendorLedger({ vendorCode, startDate, endDate })`: 매입처 하나의 기초잔액 + 일자별 차변/대변 상세 내역(적요, 상대계정, 누적잔액) 반환
- [ ] 대상 계정은 `ACC_SBJ_CD='0251'`만
- [ ] 매입발생=대변(4), 지급=차변(3) 방향으로 정확히 계산 (수금현황과 반대 방향 — `03-decisions.md` 참고)
- [ ] `npx tsc --noEmit` 통과

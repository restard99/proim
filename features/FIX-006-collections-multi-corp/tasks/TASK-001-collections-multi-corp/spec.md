# TASK-001: 수금현황 법인 선택 탭 추가

## 목적
FEAT-009 출금조회와 동일하게 수금현황 화면에 태평소금/태평염전/섬들채 법인 선택 탭을 추가한다.

## 작업 범위
- 수정할 파일:
  - `lib/yerp/collections.ts`: `CORP_CODE` 하드코딩 제거, `getCollectionsByCustomer`/`getCustomerLedger`가 `corpCode` 파라미터를 받도록 변경
  - `app/actions/collections.ts`: `corpCode` 파라미터 전달
  - `components/collections/CollectionsView.tsx`: 상단에 법인 선택 탭(세그먼트 버튼) 추가, `disbursement-corps.ts`의 `DISBURSEMENT_CORPS` 재사용 (0251/0253과 무관한 범용 법인 목록이므로 이름 그대로 재사용 가능)

## 완료 기준
- [ ] 법인 탭 전환 시 거래처 목록/원장이 해당 법인 데이터로 재조회됨
- [ ] 태평소금(0460) 결과가 기존과 동일 (회귀 없음)
- [ ] 태평염전(0400)/섬들채(0360) 실데이터로 정상 조회 확인
- [ ] `npx tsc --noEmit` 통과

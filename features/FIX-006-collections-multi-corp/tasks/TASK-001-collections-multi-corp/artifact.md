# TASK-001: 수금현황 법인 선택 탭 추가 — 아티팩트

## 상태: 배포 완료

## 수정 내용
FEAT-009 출금조회에서 만든 법인 상수 파일을 `lib/yerp/disbursement-corps.ts` → `lib/yerp/corps.ts`(`YERP_CORPS`/`YerpCorpCode`)로 범용화하고, 수금현황도 `CORP_CODE` 하드코딩을 제거해 파라미터로 받도록 수정했다. 화면 상단에 출금조회와 동일한 스타일의 법인 선택 탭을 추가했다.

## 수정된 파일
- `lib/yerp/corps.ts` (신규, `disbursement-corps.ts`에서 이름 변경): `YERP_CORPS`/`YerpCorpCode`로 범용화, 출금조회/수금현황 공용
- `lib/yerp/disbursements.ts`: `corps.ts`의 타입을 재수출하도록 변경 (기존 `DisbursementCorpCode` 이름 유지, 하위 호환)
- `components/disbursements/DisbursementsView.tsx`: import 경로만 `corps.ts`로 변경
- `lib/yerp/collections.ts`: `CORP_CODE` 하드코딩 제거, `getCollectionsByCustomer`/`getCustomerLedger`가 `corpCode: YerpCorpCode` 파라미터를 받도록 변경
- `app/actions/collections.ts`: `corpCode` 파라미터 전달
- `components/collections/CollectionsView.tsx`: 상단에 법인 선택 탭 추가 (출금조회와 동일한 UI)

## 완료 기준 확인
- [x] 법인 탭 전환 시 거래처 목록/원장이 해당 법인 데이터로 재조회됨
- [x] 태평소금(0460) 결과: 94개 거래처, 회귀 없음 (기존 로직과 계산식 동일, 파라미터만 교체)
- [x] 태평염전(0400) 43개, 섬들채(0360) 74개 거래처로 정상 조회 확인 (매출채권 계정 0108/0110, 방향(발생=차변3) 3개 법인 모두 실데이터 대조 검증 완료 — `01-spec.md` 참고)
- [x] `npx tsc --noEmit` 통과

## 이슈 및 결정사항
FEAT-009에서 만든 `disbursement-corps.ts`가 이름과 달리 이제 두 화면(출금조회/수금현황)에서 공용으로 쓰여, `corps.ts`로 이름을 바꾸고 `YERP_CORPS`/`YerpCorpCode`로 범용화했다. `disbursements.ts`는 기존 코드와의 호환을 위해 `DisbursementCorpCode` 이름을 유지하되 내부적으로 `YerpCorpCode`를 재수출하도록 했다.

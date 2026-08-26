# TASK-002: 서버 액션 + 화면 컴포넌트 — 아티팩트

## 상태: 배포 완료

## 구현 내용
TASK-001의 조회 로직을 화면에 연결했다. `collections.ts`/`CollectionsView.tsx`/`collections/page.tsx`와 동일한 패턴으로 서버 액션, React 컴포넌트, 페이지 라우트를 만들었다. `02-design.html` 목업과 동일한 구조(조회기간·검색 → 요약 카드 → 매입처 목록 → 클릭 시 원장 펼침)이며, 매입발생/지급 라벨과 배지 색상을 TASK-001에서 검증한 방향(매입발생=대변)에 맞게 배정했다.

## 생성/수정된 파일
- `app/actions/disbursements.ts`: `getDisbursementsData`(목록 + 합계), `getVendorLedgerData`(원장) 서버 액션
- `components/disbursements/DisbursementsView.tsx`: 목록/원장 화면 컴포넌트
- `app/(app)/disbursements/page.tsx`: 로그인 확인 + `canViewDisbursements`(TASK-003) 권한 체크 후 렌더

## 완료 기준 확인
- [x] `02-design.html`과 동일한 구조
- [x] 로그인 확인 + 관리자 권한 체크, 미충족 시 `/`로 리다이렉트
- [x] 로딩(`거래 내역을 불러오는 중…`)/빈 상태(`해당 기간 출금 데이터가 없습니다`) UI 포함
- [x] `npx tsc --noEmit` 통과

## 이슈 및 결정사항
- `page.tsx`가 TASK-003의 `canViewDisbursements`에 의존해 개발 순서를 TASK-003 → TASK-002로 조정했다 (각 커밋에서 `tsc` 통과 유지 목적, 최종 산출물 범위는 계획과 동일).
- 개발 서버(`localhost:3000/disbursements`)에 비로그인 상태로 접속해 500 에러 없이 `/login`으로 정상 리다이렉트되는 것을 확인했다. 관리자 로그인 후 실제 화면 동작(목록/원장 펼침)은 6단계 테스트 케이스에서 사용자가 직접 확인 예정.

## 추가 수정 (법인 선택 탭)
`DisbursementsView.tsx` 상단에 태평소금/태평염전/섬들채 3개 법인을 전환하는 세그먼트 버튼을 추가했다. `corpCode` state를 두 서버 액션 호출에 전달하고, `useEffect` 의존성 배열에 포함시켜 법인을 바꾸면 목록/원장 캐시가 초기화되고 재조회되도록 했다.

# FIX-006: 수금현황에 법인 선택 탭 추가

## 문제 상황
수금현황 화면(`/collections`)은 태평소금(CORP_CODE=0460) 매출채권만 조회한다. Y-ERP는 태평소금 외에 태평염전(0400), 섬들채(0360)도 같은 DB에서 관리하는데, 이 두 법인의 수금현황은 확인할 방법이 없다.

## 현재 동작
`lib/yerp/collections.ts`에 `CORP_CODE = "0460"`이 하드코딩되어 있어 태평소금 데이터만 조회된다.

## 기대 동작
FEAT-009 출금조회 화면과 동일하게, 화면 상단에 태평소금/태평염전/섬들채 법인 선택 탭을 두고 선택한 법인의 거래처별 매출채권 현황을 조회한다.

## 영향 범위
- `lib/yerp/collections.ts`: `CORP_CODE` 하드코딩 제거, 파라미터화
- `app/actions/collections.ts`: `corpCode` 파라미터 전달
- `components/collections/CollectionsView.tsx`: 법인 선택 탭 UI 추가
- 매출채권 계정(0108 외상매출금, 0110 받을어음)은 3개 법인 모두 존재하는지, 차변/대변 방향이 동일한지 먼저 실데이터로 확인 필요

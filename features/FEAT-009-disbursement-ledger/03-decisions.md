# 출금조회 개발 결정사항

## 라우트 구조
- `app/(app)/disbursements/page.tsx`: 서버 컴포넌트. 로그인/관리자 권한 체크 후 `DisbursementsView` 렌더
- `app/actions/disbursements.ts`: `"use server"` 액션 — `getDisbursementsData`, `getVendorLedgerData` (수금현황의 `app/actions/collections.ts`와 동일한 얇은 래퍼 패턴)
- `lib/yerp/disbursements.ts`: Y-ERP 조회 로직 (`getDisbursementsByVendor`, `getVendorLedger`)

## 데이터베이스 스키마
새 Supabase 테이블 없음 — Y-ERP(SMARTE_DB) 읽기 전용 조회만 사용. 권한은 기존 `profiles.role` 컬럼(admin 여부)으로 판단.

## 계정 방향 (핵심 결정사항 — 실데이터로 검증 완료)
외상매입금(0251)·미지급금(0253)은 **부채** 계정이라, 자산 계정인 매출채권(0108, 수금현황)과 차변/대변 방향이 반대다.
- 실제 매입 전표(`AC_PURC_SALE_T.PURC_SALE_SEC='2'`)를 `SLIP_NO`/`SLIP_DT`로 `AC_GNR_SLIP_T`와 매칭해 확인: 0251은 매입 발생 26건, 0253은 673건 전부 `DEB_CRD='4'`(대변)로 기록됨.
- **매입발생(부채 증가) = 대변(4)**, **지급/출금(부채 감소) = 차변(3)**
- 수금현황(`lib/yerp/collections.ts`)은 반대(발생=차변3, 수금=대변4)이므로, 코드를 그대로 복사하면 부호가 뒤집힌다 — 잔액 계산식(`SUM(CASE WHEN DEB_CRD='4' THEN AMT ELSE -AMT END)`)과 누적잔액 로직에 이 방향을 명시적으로 반영해야 한다.

## 법인(CORP_CODE) 확장 (6단계 테스트 중 발견)
사용자가 태평소금(0460) 외에 태평염전(0400), 섬들채(0360)도 함께 보고 싶다고 요청. `SHUSER.V_CORP_BIZ_INFO`로 법인명 매핑을 확인(0460=주식회사 태평소금, 0400=태평염전, 0360=주식회사 섬들채)하고, 세 법인 모두 0251/0253 계정에 실데이터가 있는지, `AC_ACC_SBJ_T.DEB_CRD_SEC`(정상잔액 방향)와 매입 전표 대조 검증으로 차변/대변 방향이 동일한지(세 법인 모두 대변=매입발생으로 100% 일치) 확인 후 `CORP_CODE`를 하드코딩 상수에서 함수 파라미터로 바꿨다.
- `lib/yerp/disbursements.ts`에 `DISBURSEMENT_CORPS` 상수(코드/법인명 3개) 추가, `getDisbursementsByVendor`/`getVendorLedger`가 `corpCode`를 파라미터로 받도록 변경
- `DisbursementsView.tsx` 상단에 법인 선택 탭(세그먼트 버튼) 추가, 선택값이 바뀌면 목록/원장 캐시를 초기화하고 재조회

## 계정 범위 수정 (6단계 테스트 중 발견)
최초 결정(0251만)으로 배포 전 테스트했더니 부자재 매입처(수정실업/원지/제일산업 등)가 목록에서 전부 누락됐다. 원인 조사 결과, Y-ERP는 **원재료(소금) 매입은 0251, 부재료(부자재)는 0253으로 계정을 분리**해서 쓰고 있었다 — 애초에 "부자재 구입대금"이 궁금해서 시작한 기능인데 정작 그 계정(0253)을 빼놓은 것. 0253도 매입 전표와 대조 검증해 동일한 방향(발생=대변)임을 확인하고, 두 계정을 `IN` 절로 함께 조회하도록 수정했다(`lib/yerp/disbursements.ts`의 `AP_ACCOUNT_CODES` 배열).
- 0253은 부자재 매입 외에 카드대금·보험료·세금 등 일반 미지급금도 섞여 있지만, 사용자가 "0251+0253 모두 합치기"를 선택해 필터링 없이 통합 조회하기로 했다.

## 컴포넌트 구조
- `components/disbursements/DisbursementsView.tsx`: `CollectionsView.tsx`와 동일한 2단 구조(목업 참고) — 조회기간/거래처 검색 → 매입처별 목록 → 클릭 시 원장 펼침
- `components/layout/nav-items.ts`:
  - `DISBURSEMENT_NAV_ITEMS: NavItem[]` 신규 배열, `{ href: "/disbursements", label: "출금조회", team: "관리자" }`
  - `canViewDisbursements(team, role)`: `role === "admin"`일 때만 true (팀 무관, 관리자 전용)
  - `getVisibleBusinessNavItems`에서 `canViewInventory` 처리 직후에 `canViewDisbursements` 체크 추가 (재고현황 바로 아래 배치)
  - `team: "관리자"`로 지정하면 FIX-004에서 만든 관리자 전용 배지 렌더링이 코드 변경 없이 그대로 재사용됨

## 외부 의존성
없음 (기존 `mssql` 패키지, 기존 컴포넌트 패턴 재사용)

## 결정 근거
- 수금현황과 최대한 동일한 패턴을 따르는 이유: 사용자가 이미 익숙한 화면 구조이고, 검증된 원장 조회 로직(기초잔액 계산, 누적잔액, 상대계정 서브쿼리)을 그대로 재사용할 수 있어 버그 위험이 낮음
- `team: "관리자"` 재사용 이유: 이미 FIX-004에서 "관리자에게만 보이는 팀 배지" 렌더링 로직이 구현되어 있어, 새 UI 코드 없이 배지를 얻을 수 있음
- 별도 `canViewDisbursements` 함수를 둔 이유: `canViewInventory`는 영업채산팀 팀원도 true를 반환하므로, 관리자 전용 접근을 강제하려면 재고현황과 같은 배열/조건에 묶을 수 없음

# 출금조회 개발 결정사항

## 라우트 구조
- `app/(app)/disbursements/page.tsx`: 서버 컴포넌트. 로그인/관리자 권한 체크 후 `DisbursementsView` 렌더
- `app/actions/disbursements.ts`: `"use server"` 액션 — `getDisbursementsData`, `getVendorLedgerData` (수금현황의 `app/actions/collections.ts`와 동일한 얇은 래퍼 패턴)
- `lib/yerp/disbursements.ts`: Y-ERP 조회 로직 (`getDisbursementsByVendor`, `getVendorLedger`)

## 데이터베이스 스키마
새 Supabase 테이블 없음 — Y-ERP(SMARTE_DB) 읽기 전용 조회만 사용. 권한은 기존 `profiles.role` 컬럼(admin 여부)으로 판단.

## 계정 방향 (핵심 결정사항 — 실데이터로 검증 완료)
외상매입금(0251)은 **부채** 계정이라, 자산 계정인 매출채권(0108, 수금현황)과 차변/대변 방향이 반대다.
- 실제 매입 전표(`AC_PURC_SALE_T.PURC_SALE_SEC='2'`)를 `SLIP_NO`/`SLIP_DT`로 `AC_GNR_SLIP_T`와 매칭해 확인: 매입 발생 26건 전부 `DEB_CRD='4'`(대변)로 기록됨.
- **매입발생(부채 증가) = 대변(4)**, **지급/출금(부채 감소) = 차변(3)**
- 수금현황(`lib/yerp/collections.ts`)은 반대(발생=차변3, 수금=대변4)이므로, 코드를 그대로 복사하면 부호가 뒤집힌다 — 잔액 계산식(`SUM(CASE WHEN DEB_CRD='4' THEN AMT ELSE -AMT END)`)과 누적잔액 로직에 이 방향을 명시적으로 반영해야 한다.

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

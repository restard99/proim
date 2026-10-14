# 출금조회 엑셀 내보내기 개발 결정사항

## 라우트 구조
- 별도 라우트 없음. 기존 `/disbursements` 화면에 버튼만 추가
- 신규 Server Action: `exportDisbursementsExcel(params)` in `app/actions/disbursements.ts`
  - 기존 `executive-pl.ts`의 `exportProfitLossExcel`과 동일한 패턴(`{ ok: true, base64, fileName } | { ok: false, message }` 반환) 재사용

## 데이터베이스 스키마
변경 없음. Y-ERP 조회 전용 기능이라 Supabase 테이블 추가/수정 없음.

## 데이터 조회 방식
- 매입처별 요약은 기존 `getDisbursementsByVendor()` 그대로 재사용
- 상세내역은 매입처마다 따로 조회(N+1)하지 않고, `lib/yerp/disbursements.ts`에 신규 함수 `getAllVendorLedgerEntries(params)`를 추가해 **조건에 맞는 전체 거래를 한 번의 SQL로 조회**한 뒤, JS에서 `CUST_CD`별로 그룹핑하고 각 매입처의 `beginBalance`(요약 조회 결과에서 가져옴)부터 누적잔액을 계산
  - 이유: 매입처가 수십 곳일 수 있어 기존 화면의 클릭별 개별 조회(`getVendorLedger`) 방식을 그대로 쓰면 내보내기 한 번에 매입처 수만큼 쿼리가 나가 느려짐

## 컴포넌트/파일 구조
- `lib/yerp/disbursements.ts`: `getAllVendorLedgerEntries()` 추가 (기존 `getVendorLedger`의 쿼리를 `CUST_CD` 단일 필터 없이 전체 대상으로 바꾼 버전 + 그룹핑/누적계산 로직)
- `app/actions/disbursements.ts`: `exportDisbursementsExcel()` 추가 — 요약 + 상세를 ExcelJS로 한 시트에 작성
  - 상단: 제목행, 요약표(매입처/기초잔액/매입발생/지급액/기말잔액)
  - 빈 행
  - 하단: 상세 헤더행, 매입처가 바뀔 때마다 매입처명 구분행 삽입 후 해당 매입처의 일자별 항목(일자/구분/적요·상대계정/금액/잔액)
  - 파일명: `{법인명}_출금조회_{시작일}_{종료일}.xlsx`
- `components/disbursements/DisbursementsView.tsx`: "엑셀 다운로드" 버튼 추가
  - `useTransition`으로 `isExporting` 상태 관리 (기존 `ProfitLossView.tsx`의 `exportProfitLossExcel` 호출 패턴과 동일)
  - base64 → Blob 다운로드 헬퍼(`downloadBase64`)는 `ProfitLossView.tsx`에 있는 것과 동일한 형태로 로컬에 작성 (기존 프로젝트에 공용 유틸이 따로 없어 기존 관례를 그대로 따름)
  - 데이터 없음(`data.rows.length === 0`) 또는 내보내는 중일 때 버튼 비활성화

## 외부 의존성
없음. `exceljs`가 이미 설치되어 있어 추가 설치 불필요.

## 결정 근거
- 기존 `exportProfitLossExcel`의 반환 타입/다운로드 방식을 그대로 따라 일관성 유지
- 상세내역 일괄 조회를 별도 함수로 분리해 N+1 쿼리 문제를 피함 — 기존 화면의 클릭식 개별 조회(`getVendorLedger`)는 그대로 유지하고 건드리지 않음 (화면 동작에는 영향 없음)

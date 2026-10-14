# TASK-002: 엑셀 생성 Server Action — 아티팩트

## 상태: 완료

## 구현 내용
`exportDisbursementsExcel()`을 추가했다. 요약 목록(`getDisbursementsByVendor`)과 전체 상세내역(`getAllVendorLedgerEntries`)을 조회한 뒤 ExcelJS로 한 시트에 제목행 → 요약표 → 빈 행 → 매입처별 구분행+상세내역 순으로 작성해 base64로 반환한다. 반환 타입은 기존 `executive-pl.ts`의 `ExportResult`와 동일한 형태다.

## 생성/수정된 파일
- `app/actions/disbursements.ts`: `exportDisbursementsExcel(input)`, `ExportResult` 타입, `formatSlipDateDot` 헬퍼 추가

## 완료 기준 확인
- [x] 요약 행은 화면 조회 결과(`getDisbursementsByVendor`)를 그대로 사용하므로 숫자 일치
- [x] 상세내역에 모든 매입처가 구분행으로 포함됨 (거래 없는 매입처는 구분행만, entries 반복문이 0회 실행)
- [x] 매입처 목록이 비어 있으면 `{ ok: false, message: "내보낼 데이터가 없습니다." }` 반환
- [x] `npx tsc --noEmit` 통과

## 이슈 및 결정사항
없음.

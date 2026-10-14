# TASK-002: 엑셀 생성 Server Action

## 목적
현재 조회조건(법인/기간/검색어)에 맞는 매입처별 요약 + 전체 상세내역을 한 시트짜리 엑셀 파일로 만들어 base64로 반환하는 Server Action을 만든다.

## 작업 범위
- 수정할 파일: `app/actions/disbursements.ts`

구현 내용:
- `exportDisbursementsExcel(params: { corpCode, startDate, endDate, search? }): Promise<ExportResult>` 추가
  - `ExportResult` 타입은 `app/actions/executive-pl.ts`의 것과 동일한 형태로 로컬 정의: `{ ok: true; base64: string; fileName: string } | { ok: false; message: string }`
  - `getDisbursementsByVendor()`로 요약 목록을 가져오고, 그 결과를 `getAllVendorLedgerEntries()`에 넘겨 상세내역을 가져온다
  - 요약 목록이 비어 있으면 `{ ok: false, message: "내보낼 데이터가 없습니다." }` 반환
  - ExcelJS로 워크시트 1개 작성:
    1. 제목행: `{법인명} 출금조회 ({시작일} ~ {종료일})`
    2. 빈 행
    3. 요약 헤더행: 매입처 / 기초잔액 / 매입발생 / 지급액 / 기말잔액
    4. 매입처별 요약 데이터 행
    5. 빈 행
    6. 상세 헤더행: 매입처 / 일자 / 구분 / 적요·상대계정 / 금액 / 잔액
    7. 매입처별로 구분행(매입처명, 나머지 칸 병합 또는 공백) 삽입 후 해당 매입처의 거래 항목 행 나열 (구분은 "매입발생"/"지급" 텍스트로, `entry.debCrd`가 "4"면 매입발생, "3"이면 지급)
  - 제목행 bold, 헤더행 bold, 컬럼 너비는 `executive-pl.ts`와 비슷하게 지정
  - 파일명: `{법인명}_출금조회_{startDate}_{endDate}.xlsx` (YYYYMMDD 그대로 사용)

## 완료 기준
- [ ] 요약 행과 화면에 표시되는 요약표의 숫자가 완전히 일치
- [ ] 상세내역에 포함된 매입처 수가 요약 행 수와 같음 (거래가 없는 매입처도 구분행만 있고 항목은 0건)
- [ ] 데이터 없음 케이스에서 `ok: false` 반환 확인
- [ ] `npx tsc --noEmit` 통과

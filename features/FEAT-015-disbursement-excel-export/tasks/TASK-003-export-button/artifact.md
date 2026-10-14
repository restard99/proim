# TASK-003: 화면에 엑셀 다운로드 버튼 연결 — 아티팩트

## 상태: 배포 완료

## 구현 내용
출금조회 화면의 조회조건 영역(매입처 검색 입력 옆)에 "엑셀 다운로드" 버튼을 추가했다. 클릭 시 현재 법인/기간/검색어로 `exportDisbursementsExcel`을 호출하고, 성공하면 base64 결과를 Blob으로 변환해 다운로드한다 (`ProfitLossView.tsx`의 기존 다운로드 패턴과 동일). 데이터가 없거나 생성 중일 때는 버튼이 비활성화되고, 생성 중에는 스피너와 "생성 중…" 문구로 바뀐다.

## 생성/수정된 파일
- `components/disbursements/DisbursementsView.tsx`: `exportDisbursementsExcel` import, `downloadBase64` 헬퍼, `isExporting` 상태, `handleExport`, 버튼 UI 추가

## 완료 기준 확인
- [x] 실제 Y-ERP 데이터(섬들채, 2026-01-01~2026-10-14, 매입처 107곳)로 독립 스크립트를 통해 엑셀 생성 로직을 직접 실행해 구조(제목행→요약표→빈행→상세헤더→매입처별 구분행+내역) 검증, 요약 숫자와 상세 누적잔액이 화면 조회(`getDisbursementsByVendor`/`getVendorLedger`)와 일치함을 확인
- [x] 데이터 없음/생성 중 버튼 비활성화 로직 코드 반영
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 모두 통과

## 이슈 및 결정사항
- 검증 중 상세내역의 "상대계정" 표시값이 간혹 일괄조회와 개별조회 사이에 다르게 나오는 경우를 발견 — 원인은 기존 `getVendorLedger`에도 이미 있던 `TOP 1`(ORDER BY 없음) 서브쿼리의 비결정성이며, 이번 기능으로 새로 생긴 문제는 아니다. 화면/엑셀 모두 "적요"(NOTE_NM)가 있으면 그걸 우선 표시하고 상대계정은 적요가 빈 경우의 보조 표시라 실사용 영향은 낮음. 이번 기능 범위 밖이라 별도로 수정하지 않았다.

# TASK-009: 손익자료 화면

## 목적
TASK-005의 손익 집계 모듈을 화면으로 연결하고, 엑셀/PDF 내보내기를 붙인다.

## 작업 범위
- 생성할 파일:
  - `app/actions/executive-pl.ts`: `getProfitLoss(corpCode, yearMonth)`, `exportProfitLossExcel(corpCode, yearMonth)`
  - `app/(app)/executive/pl/page.tsx`
  - `components/executive/ProfitLossView.tsx`

## 완료 기준
- [ ] 법인 탭(태평소금/태평염전/섬들채) 전환 시 해당 법인 데이터로 갱신
- [ ] 월 선택 시 당월(전월·전년동월 대비), 월누적(YTD, 전년 대비) 표 모두 갱신
- [ ] 엑셀 내보내기 클릭 시 현재 화면 데이터로 .xlsx 다운로드
- [ ] PDF 내보내기(인쇄) 클릭 시 인쇄 미리보기로 표가 잘리지 않고 표시
- [ ] `npx tsc --noEmit` 통과, 브라우저에서 실제 데이터로 확인

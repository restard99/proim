# TASK-003: 화면에 엑셀 다운로드 버튼 연결

## 목적
출금조회 화면에 "엑셀 다운로드" 버튼을 추가해, 현재 조회조건으로 TASK-002의 Server Action을 호출하고 결과 파일을 다운로드한다.

## 작업 범위
- 수정할 파일: `components/disbursements/DisbursementsView.tsx`

구현 내용:
- `02-design.html`의 버튼 위치(조회조건 영역, 매입처 검색 입력 옆)에 맞춰 버튼 추가
- `exportDisbursementsExcel` import, `isExporting`/`startExporting` (`useTransition`) 상태 추가
- `downloadBase64(base64, fileName)` 헬퍼를 로컬에 추가 (`ProfitLossView.tsx`에 있는 것과 동일한 구현)
- 버튼 클릭 시 현재 `corpCode`/`start`/`end`/`search` 값으로 액션 호출 → 성공 시 `downloadBase64` 호출
- 버튼 비활성 조건: `data?.rows.length === 0` (데이터 없음) 또는 `isExporting`(생성 중)
- `isExporting`일 때 버튼 라벨을 "생성 중…"으로 바꾸고 스피너 아이콘 표시 (`02-design.html` 상태 2 참고)

## 완료 기준
- [ ] 버튼 클릭 시 현재 화면과 동일한 조건의 엑셀 파일이 다운로드됨
- [ ] 데이터 없음 상태에서 버튼이 비활성화됨
- [ ] 다운로드 중 버튼이 비활성화되고 "생성 중…" 표시됨
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 모두 통과

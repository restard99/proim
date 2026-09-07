# TASK-001: 표 스타일을 생산의뢰서 톤에 맞춰 개선 — 아티팩트

## 상태: 배포 완료

## 수정 내용
`InventoryTable`을 생산의뢰서 화면과 같은 격자형 스타일(헤더 배경 강조 + 열 사이 세로 구분선 + 가운데 정렬 + 숫자 font-mono)로 바꾸고, 현재고 값은 데이터 행에서도 굵게 강조했다.

## 수정된 파일
- `components/production/ProductionMaterialInventoryView.tsx`: `InventoryTable`의 헤더/본문 셀 클래스를 생산의뢰서와 동일한 톤으로 교체, 현재고 열에 `font-semibold` 추가, 합계 행 스타일을 상단 구분선+배경 강조로 변경

## 완료 기준 확인
- [x] 헤더: bg-mist/40 배경, 가운데 정렬, 열 사이 세로 구분선
- [x] 본문: text-sm, 가운데 정렬, 열 사이 세로 구분선, 숫자 열 font-mono
- [x] 합계 행: 상단 구분선 + 배경 강조 + 굵게
- [x] 현재고 열 데이터 행도 font-semibold
- [x] `npx tsc --noEmit`, `npx eslint` 통과

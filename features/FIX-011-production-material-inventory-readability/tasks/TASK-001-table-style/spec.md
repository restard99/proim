# TASK-001: 표 스타일을 생산의뢰서 톤에 맞춰 개선

## 목적
`InventoryTable`을 생산의뢰서 화면과 같은 격자형 스타일로 바꾸고, 현재고 값을 굵게 강조한다.

## 작업 범위
- 수정할 파일: `components/production/ProductionMaterialInventoryView.tsx`

## 완료 기준
- [ ] 헤더: bg-mist/40 배경, 가운데 정렬, 열 사이 세로 구분선(border-l)
- [ ] 본문: text-sm, 가운데 정렬, 열 사이 세로 구분선, 숫자 열은 font-mono
- [ ] 합계 행: 상단 구분선 + 배경 강조 + 굵게
- [ ] 현재고 열은 데이터 행에서도 font-semibold로 강조
- [ ] `npx tsc --noEmit`, `npx eslint` 통과

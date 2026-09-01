# TASK-005: 수정 모드 제품명 폭 확대 + 저장 시 부자재 재매칭 — 아티팩트

## 상태: 완료

## 수정 내용
수정 모드의 모든 입력창이 `min-w-[64px]`로 동일해서 제품명처럼 긴 텍스트도 좁게 보이던 것을, 필드별 너비 맵(`EDIT_INPUT_MIN_WIDTH`)으로 제품명만 260px로 넓혔다. 또한 저장(`saveEdit`) 성공 직후 `getProductionMaterialStatus(draftItems)`를 다시 호출해 Y-ERP에서 새 제품명 기준으로 매칭을 재조회하고 `materialMap`을 갱신하도록 했다 — 이전엔 저장해도 화면을 나갔다 다시 들어와야만 새로고침됐다.

## 수정된 파일
- `components/inventory/ProductionRequestView.tsx`: `EDIT_INPUT_MIN_WIDTH` 추가, 수정 모드 입력창 클래스에 필드별 너비 적용, `saveEdit()`에 저장 후 재조회 로직 추가

## 완료 기준 확인
- [x] 수정 모드 제품명 입력창 너비 260px로 확대 (조회 화면 감각과 비슷하게)
- [x] 저장 시 `getProductionMaterialStatus(draftItems)` 재호출로 Y-ERP 재매칭 → `materialMap` 즉시 갱신
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

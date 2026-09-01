# TASK-005: 수정 모드 제품명 폭 확대 + 저장 시 부자재 재매칭

## 목적
수정 모드에서 제품명 입력창이 조회 화면 대비 너무 좁고, 수정 후 저장해도 부자재 매칭 상태가 갱신되지 않는(수정 전 상태 그대로 보이는) 두 가지를 개선한다.

## 작업 범위
- 수정할 파일: `components/inventory/ProductionRequestView.tsx`
  - 수정 모드 입력창 너비를 필드별로 다르게(제품명만 넓게)
  - `saveEdit()` 저장 성공 후 `getProductionMaterialStatus(draftItems)`로 Y-ERP에서 다시 매칭 조회해 `materialMap` 갱신

## 완료 기준
- [ ] 수정 모드의 제품명 입력창이 조회 화면의 제품명 칸과 비슷한 너비로 보임
- [ ] 제품명을 수정해서 저장하면, 별도 재선택 없이 바로 새 이름 기준으로 부자재 상태(매칭됨/애매함/미매칭, 충분/부족)가 갱신됨
- [ ] `npx tsc --noEmit`, `npm run build` 통과

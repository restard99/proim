# TASK-004: 부자재 후보 여러 개일 때 선택해서 바로 확인

## 목적
품목명 매칭 후보가 여러 개(애매함)인 경우, 기존엔 후보 이름 목록만 나열했다. 사용자 요청으로, 후보 하나를 클릭하면 그 품목의 부자재 소요량/재고를 바로 볼 수 있게 한다.

## 작업 범위
- 수정할 파일:
  - `lib/yerp/production-materials.ts`: 애매함 후보 각각의 BOM/재고도 함께 미리 계산해 `candidates: CandidateMaterialStatus[]`로 반환 (기존 `candidateNames: string[]`을 대체)
  - `components/inventory/ProductionRequestView.tsx`: 후보 목록을 클릭 가능한 버튼으로 바꾸고, 클릭 시 해당 후보의 부자재 표를 표시 (`MaterialsTable` 공용 컴포넌트로 추출)

## 완료 기준
- [ ] 후보가 여러 개인 품목에서, 후보 이름을 클릭하면 그 품목의 부자재명/소요량/재고/상태가 바로 표시됨 (추가 조회 없이 즉시)
- [ ] "다른 후보 선택"으로 되돌아가 다른 후보를 볼 수 있음
- [ ] 매칭/미매칭 케이스는 기존과 동일하게 동작 (회귀 없음)
- [ ] `npx tsc --noEmit`, `npm run build` 통과

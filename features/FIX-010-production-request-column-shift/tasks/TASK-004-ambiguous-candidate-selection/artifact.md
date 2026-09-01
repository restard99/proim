# TASK-004: 부자재 후보 여러 개일 때 선택해서 바로 확인 — 아티팩트

## 상태: 완료

## 수정 내용
후보(애매함) 매칭일 때 후보 이름만 나열하던 것을, 후보를 클릭하면 그 품목의 부자재 현황(소요량/재고/상태)을 즉시 보여주도록 바꿨다. 추가 서버 왕복 없이 바로 보이도록, 애매한 후보 전부의 BOM/재고를 첫 조회 시점에 함께 계산해서 내려준다(기존엔 유일 매칭된 품목의 BOM만 조회했음).

## 수정된 파일
- `lib/yerp/production-materials.ts`: `candidateNames: string[]` → `candidates: CandidateMaterialStatus[]`(품목코드/품목명/부자재목록/충분여부 포함)로 교체. `motherCodes` 수집 범위를 "유일 매칭된 것만" → "모든 후보(유일 매칭 + 애매함 후보 전부)"로 확장해 BOM 쿼리 한 번에 다 가져오도록 함
- `components/inventory/ProductionRequestView.tsx`: 부자재 표 렌더링을 `MaterialsTable` 공용 컴포넌트로 추출, `AmbiguousMaterialStatus` 컴포넌트 신설(후보 목록 ↔ 선택된 후보의 부자재 표를 토글)

## 완료 기준 확인
- [x] 후보 클릭 시 부자재 표 즉시 표시 — 후보별 BOM을 이미 함께 받아와 있어 클라이언트에서 바로 전환 (실제 Y-ERP 데이터로 BOM 조회 확인)
- [x] "← 다른 후보 선택"으로 목록 복귀 가능
- [x] 매칭/미매칭 케이스 로직 변경 없음 (회귀 없음)
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

## 이슈 및 결정사항
후보 선택 상태는 `AmbiguousMaterialStatus` 컴포넌트 내부의 로컬 `useState`로 관리했다 — 행을 접었다 다시 펴면 선택이 초기화되는데, 이는 의도된 동작(매번 후보 목록부터 다시 보여줌)으로 판단해 별도 영속화는 하지 않았다.

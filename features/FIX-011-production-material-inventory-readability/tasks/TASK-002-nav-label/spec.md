# TASK-002: 왼쪽 탭 팀 배지 라벨 표기 통일

## 목적
관리자에게만 보이는 왼쪽 탭의 팀 배지가 "원재료,반제품 현황" 항목만 "생산팀"으로 표기되어, 같은 생산팀 화면인 "생산일지"("생산")와 표기가 어긋난다. "생산"으로 통일한다.

## 작업 범위
- 수정할 파일: `components/layout/nav-items.ts`

## 완료 기준
- [ ] `PRODUCTION_MATERIAL_INVENTORY_NAV_ITEMS`의 `team` 배지 값을 "생산팀" → "생산"으로 변경
- [ ] 권한 체크 로직(`canViewProductionMaterialInventory`)은 영향 없음 (배지 표시용 값과 별개)

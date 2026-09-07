# TASK-002: 왼쪽 탭 팀 배지 라벨 표기 통일 — 아티팩트

## 상태: 완료

## 수정 내용
`NavItem.team`은 순수 표시용 배지 값이라(실제 권한 체크는 `canView*` 함수의 하드코딩된 문자열 비교로 별도 처리됨) 권한 로직에 영향 없이 라벨만 "생산팀" → "생산"으로 바꿨다. 다른 생산팀 화면("생산일지")과 동일하게 통일됨.

## 수정된 파일
- `components/layout/nav-items.ts`: `PRODUCTION_MATERIAL_INVENTORY_NAV_ITEMS`의 `team: "생산팀"` → `team: "생산"`

## 완료 기준 확인
- [x] 배지 값 "생산"으로 변경
- [x] 권한 체크 로직 변경 없음 확인 (`npx tsc --noEmit` 통과)

# TASK-005: 화면 컴포넌트 + 페이지 라우트 — 아티팩트

## 상태: 완료

## 구현 내용
02-design.html을 실제 동작하는 화면으로 구현했다. `ProductionLogView`의 좌측 목록/우측 상세 레이아웃을 재사용하되, 우측은 "원재료·부재료 / 반제품" 탭 전환 표 하나로 단순화했다.

## 생성된 파일
- `components/production/ProductionMaterialInventoryView.tsx`
- `app/(app)/production-material-inventory/page.tsx`

## 완료 기준 확인
- [x] 좌측: 업로드 input + 날짜별 이력 목록(최신순, 클릭 선택)
- [x] 우측: 탭 전환 표, 반제품 탭은 합계 행 표시(원재료 섹션은 합계 없으면 표시 안 함)
- [x] "원본 파일 열기", "삭제"(업로드자 본인 또는 관리자만 노출) 버튼
- [x] 빈 상태 / 로딩 상태 / 업로드 오류 메시지 처리
- [x] 페이지에서 `canViewProductionMaterialInventory`로 권한 가드
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 모두 통과 (라우트 `/production-material-inventory` 정상 등록 확인)

## 이슈 및 결정사항
없음

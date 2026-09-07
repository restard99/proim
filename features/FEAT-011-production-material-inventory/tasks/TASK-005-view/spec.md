# TASK-005: 화면 컴포넌트 + 페이지 라우트

## 목적
02-design.html의 화면을 실제 동작하는 화면으로 구현한다.

## 작업 범위
- 생성할 파일:
  - `components/production/ProductionMaterialInventoryView.tsx`
  - `app/(app)/production-material-inventory/page.tsx`

## 완료 기준
- [ ] 좌측: 업로드 input + 날짜별 이력 목록(최신순, 클릭해서 선택)
- [ ] 우측: "원재료·부재료 / 반제품" 탭 전환 표, 반제품 탭은 합계 행 표시
- [ ] "원본 파일 열기", "삭제"(업로드자 본인 또는 관리자만 노출) 버튼
- [ ] 빈 상태 / 로딩 상태 / 업로드 오류 메시지 처리
- [ ] 페이지에서 `canViewProductionMaterialInventory`로 권한 가드
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

# TASK-005: 권한/네비게이션

## 목적
생산팀·영업채산팀 사이드바 메뉴 노출과 `/production-requests`·`/production-logs` 접근 권한을 결정사항대로 재구성한다.

## 작업 범위
- 수정할 파일: `components/layout/nav-items.ts`, `app/(app)/production-requests/page.tsx`

## 완료 기준
- [ ] `canViewInventory`: 재고현황 전용으로 의미 축소(영업채산팀 + admin, 변경 없음)
- [ ] `canViewProductionRequests`(신규): 영업채산팀 + 생산팀 + admin — "생산의뢰서" nav item을 여기로 이동
- [ ] `canViewProductionLogs`(신규): 생산팀 + admin — "생산일지" nav item
- [ ] `/production-requests` 페이지 접근 가드를 `canViewProductionRequests`로 교체
- [ ] 생산팀 계정 로그인 시 사이드바에 "생산팀" 섹션(생산의뢰서/생산일지)만 노출, 재고현황은 노출 안 됨

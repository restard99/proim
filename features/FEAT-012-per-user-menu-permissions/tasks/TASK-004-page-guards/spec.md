# TASK-004: 레이아웃 + 페이지 가드 반영

## 목적
실제로 개인별 부여가 사이드바 노출과 페이지 접근 모두에 반영되게 한다.

## 작업 범위
- 수정할 파일: `app/(app)/layout.tsx`, 그리고 아래 10개 페이지 가드
  - `app/(app)/sales/page.tsx`, `collections/page.tsx`, `inventory/page.tsx`
  - `production-requests/page.tsx`, `production-logs/page.tsx`, `production-material-inventory/page.tsx`
  - `saltfield-production/page.tsx`, `saltfield-production/[date]/page.tsx`, `saltfield-inventory/page.tsx`
  - `executive/report/page.tsx`, `executive/pl/page.tsx`

## 완료 기준
- [ ] `layout.tsx`: `getGrantedHrefs`로 부여 목록을 가져와 `getVisibleBusinessNavItems`에 전달
- [ ] 각 페이지: 기존 `canView*` 가드에 `|| grantedHrefs.has("/해당경로")` 추가
- [ ] `npx tsc --noEmit`, `npm run build` 통과

# TASK-004: 레이아웃 + 페이지 가드 반영 — 아티팩트

## 상태: 완료

## 구현 내용
`layout.tsx`가 사이드바를 그릴 때 개인별 부여 목록을 반영하도록 했고, 10개 업무 페이지 가드에 `|| grantedHrefs.has("/해당경로")`를 추가해 사이드바에서 보이는 메뉴는 실제로도 들어갈 수 있게 맞췄다.

## 수정된 파일
- `app/(app)/layout.tsx`: `getGrantedHrefs` 호출 후 `getVisibleBusinessNavItems`에 전달
- `app/(app)/sales/page.tsx`, `collections/page.tsx`, `inventory/page.tsx`
- `app/(app)/production-requests/page.tsx`, `production-logs/page.tsx`, `production-material-inventory/page.tsx`
- `app/(app)/saltfield-production/page.tsx`, `saltfield-production/[date]/page.tsx`, `saltfield-inventory/page.tsx`
- `app/(app)/executive/report/page.tsx`, `executive/pl/page.tsx`

## 완료 기준 확인
- [x] `layout.tsx`에 반영
- [x] 10개 페이지 가드 모두 반영 (`saltfield-production/[date]`는 목록 페이지와 같은 href `/saltfield-production` 기준으로 판정)
- [x] `npx tsc --noEmit`, `npm run build` 통과

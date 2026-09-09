# TASK-007: 매출업로드 메뉴/권한 뼈대

## 목적
섬들채 업장별 실적(매출)을 별도 파일로 올리는 "매출업로드" 화면의 메뉴·권한 뼈대를 먼저 만든다. 실제 업로드 로직은 파일 형식을 받은 뒤 별도 태스크에서 만든다.

## 작업 범위
- 생성할 파일: `app/(app)/executive/sales-upload/page.tsx`, `components/executive/SeomdeulchaeSalesUploadPanel.tsx`
- 수정할 파일: `components/layout/nav-items.ts`, `components/admin/ExecutiveTargetUpload.tsx`

## 완료 기준
- [ ] `canUploadSeomdeulchaeSales`(관리자 전용) + `GRANTABLE_MENU_ITEMS`에 "매출업로드" 추가 — 게시판 권한에서 지정한 섬들채 담당자에게 개별로 열어줄 수 있음
- [ ] `/executive/sales-upload` 페이지: 관리자 또는 개인 부여 시 접근 가능, 준비 중 안내
- [ ] "매출 목표 관리" 페이지의 "매출/생산 목표" 섹션 바로 아래에 같은 패널 노출
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

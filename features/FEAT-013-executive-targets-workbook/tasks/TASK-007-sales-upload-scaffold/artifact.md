# TASK-007: 매출업로드 메뉴/권한 뼈대 — 아티팩트

## 상태: 배포 완료 (업로드 로직은 TASK-008에서 이어짐)

## 구현 내용
사용자 피드백으로 범위가 조정됐다 — 섬들채 업장별 **실적(매출)**은 "매출/생산 목표" 워크북이 아니라 **별도 파일**로, **별도 화면**에서 업로드하게 된다. 이 화면은 관리자뿐 아니라 관리자가 "게시판 권한"에서 지정한 섬들채 담당자도 쓸 수 있어야 해서, FEAT-012의 개인별 메뉴 부여 체계에 그대로 얹었다.

`BUSINESS_MENU_ITEMS`에 새 항목을 추가하기만 하면 `getVisibleBusinessNavItems`(사이드바 노출)와 `GRANTABLE_MENU_ITEMS`(게시판 권한 화면 목록)에 자동으로 반영되는 FEAT-012 설계 덕분에, 이 태스크는 새 nav 항목 하나 추가 + 페이지 가드 하나만 있으면 됐다.

실제 파일 형식이 아직 확정되지 않아(사용자가 "곧 준다"고 함), 업로드 로직은 넣지 않고 화면/권한 뼈대만 만들었다. "전년대비" 비교 수치는 "전체" 탭 Q/R열(전년실적/전년대비)에 법인별+섬들채 업장별로 이미 있는 것을 확인했다 — 실제 실적 업로드 로직을 만들 때 같이 반영한다.

## 생성/수정된 파일
- `components/layout/nav-items.ts`: `SEOMDEULCHAE_SALES_UPLOAD_NAV_ITEMS`, `canUploadSeomdeulchaeSales` 추가, `BUSINESS_MENU_ITEMS`에 등록(grantable: true)
- `app/(app)/executive/sales-upload/page.tsx` (신규): 관리자 또는 개인 부여 시 접근 가능한 페이지
- `components/executive/SeomdeulchaeSalesUploadPanel.tsx` (신규): "준비 중" 안내 패널(실제 업로드 UI는 후속)
- `components/admin/ExecutiveTargetUpload.tsx`: "매출/생산 목표" 섹션 바로 아래에 같은 패널 노출

## 완료 기준 확인
- [x] 권한 뼈대(관리자 기본 + 개인 부여)
- [x] 페이지 가드
- [x] 관리자 화면에도 노출
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

## 이슈 및 결정사항
- 실적 업로드 파일 형식 미확정 — 받는 대로 파서/서버 액션을 추가하는 후속 태스크 필요(FEAT-013 범위 내 또는 별도 FIX)
- "전체" 탭에서 확인된 전년대비 위치: 법인별 블록(Q=전년실적/R=전년대비, C열 법인명 기준), 섬들채 업장별 블록도 같은 열 구성으로 바로 아래에 반복됨

# TASK-001: 게시판 권한 탭 이동 — 아티팩트

## 상태: 배포 완료

## 수정 내용
"게시판 권한" 탭을 가입 승인 관리에서 빼고 시스템검토 게시판으로 옮겼다. 가입 승인 관리는 2탭(가입 승인/전체 사용자)으로 되돌리고 폭도 `max-w-4xl`로 원복했다. 시스템검토 게시판은 "계정으로 보기"(기존 picker)/"게시판 권한" 2탭 구조로 재구성했다.

## 수정된 파일
- `components/admin/AdminApprovalsTabs.tsx`: 게시판 권한 탭 제거
- `app/(app)/admin/approvals/page.tsx`: `getGrantableUsers` 조회 제거, 폭 원복
- `app/(app)/admin/view-as/page.tsx`: `getGrantableUsers` 조회 추가, `AdminViewAsTabs`로 교체
- `components/admin/AdminViewAsTabs.tsx` (신규): 탭 전환 + 각 탭 렌더링 (기존 `AdminViewAsPicker`, `MenuPermissionsPanel` 그대로 재사용)

## 완료 기준 확인
- [x] 가입 승인 관리 2탭
- [x] 시스템검토 게시판 2탭, 계정 전환 기능 그대로 동작
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

# TASK-006: 가입 승인 페이지 탭 구조 연결 — 아티팩트

## 상태: 배포 완료

## 구현 내용
"가입 승인 관리" 페이지를 3탭(가입 승인/전체 사용자/게시판 권한) 구조로 바꿨다. 기존 두 섹션은 그대로 각 탭으로 옮기고, 새 탭에 `MenuPermissionsPanel`을 연결했다. 두 번째 컬럼(사용자 목록+메뉴 체크박스)이 넉넉하게 들어가도록 페이지 폭을 `max-w-4xl` → `max-w-6xl`로 넓혔다.

## 생성/수정된 파일
- `components/admin/AdminApprovalsTabs.tsx` (신규): 탭 전환 + 각 탭 렌더링
- `app/(app)/admin/approvals/page.tsx`: 서버에서 대기 목록/전체 사용자/부여 가능 사용자를 모두 조회해 `AdminApprovalsTabs`에 전달

## 완료 기준 확인
- [x] 탭 전환 UI, 가입 승인 대기 건수 배지 유지
- [x] 기존 `ApprovalTable`/`UserAccountTable` 동작 그대로 유지
- [x] "게시판 권한" 탭에 `MenuPermissionsPanel` 연결
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

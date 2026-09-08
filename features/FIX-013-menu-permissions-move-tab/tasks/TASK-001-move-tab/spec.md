# TASK-001: 게시판 권한 탭 이동

## 목적
"게시판 권한" 탭을 가입 승인 관리에서 시스템검토 게시판으로 옮긴다.

## 작업 범위
- 수정할 파일: `components/admin/AdminApprovalsTabs.tsx`, `app/(app)/admin/approvals/page.tsx`, `app/(app)/admin/view-as/page.tsx`
- 생성할 파일: `components/admin/AdminViewAsTabs.tsx`

## 완료 기준
- [ ] 가입 승인 관리: 가입 승인/전체 사용자 2탭
- [ ] 시스템검토 게시판: 계정으로 보기/게시판 권한 2탭, 기존 계정 전환 기능 그대로 동작
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

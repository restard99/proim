# TASK-006: 가입 승인 페이지 탭 구조 연결

## 목적
기존 "가입 승인 관리" 페이지를 3개 탭(가입 승인/전체 사용자/게시판 권한) 구조로 바꾼다.

## 작업 범위
- 생성할 파일: `components/admin/AdminApprovalsTabs.tsx`
- 수정할 파일: `app/(app)/admin/approvals/page.tsx`

## 완료 기준
- [ ] 탭 전환 UI (가입 승인 대기 건수 배지 유지)
- [ ] 기존 `ApprovalTable`/`UserAccountTable` 동작 그대로 유지
- [ ] "게시판 권한" 탭에 `MenuPermissionsPanel` 연결(부여 가능 사용자 목록을 서버에서 미리 조회해 전달)
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

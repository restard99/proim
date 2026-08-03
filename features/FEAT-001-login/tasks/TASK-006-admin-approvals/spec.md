# TASK-006: 관리자 승인 관리

## 목적
관리자 계정이 대기 중인 가입 요청을 확인하고 승인 또는 반려할 수 있게 한다.

## 작업 범위
- 생성할 파일: `app/admin/approvals/page.tsx`, `components/admin/ApprovalTable.tsx`
- 수정할 파일: `app/actions/approvals.ts` (`approveUser`, `rejectUser` Server Actions 신규 생성)
- 참고 파일: `features/FEAT-001-login/02-design.html`의 `view-admin-list`, `view-admin-empty`

## 완료 기준
- [ ] `status='pending'`인 프로필 목록을 이름/소속팀/직급/가입 요청일시와 함께 표시
- [ ] [승인] 클릭 시 `status='approved'`, `approved_by`, `approved_at` 갱신
- [ ] [반려] 클릭 시 `status='rejected'`
- [ ] 대기 목록이 없을 때 빈 상태 화면 표시 (design.html `view-admin-empty` 참고)
- [ ] Server Action 내부에서 요청자의 `role='admin'` 여부를 재검증 (미들웨어 가드와 별개로 서버에서도 확인)

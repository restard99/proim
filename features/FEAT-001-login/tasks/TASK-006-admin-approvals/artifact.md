# TASK-006: 관리자 승인 관리 — 아티팩트

## 상태: 배포 완료

## 구현 내용
관리자가 대기 중인 가입 요청을 확인하고 승인/반려할 수 있는 `/admin/approvals` 페이지와 `approveUser`/`rejectUser` Server Action을 구현했다. 미들웨어(proxy.ts)의 역할 가드와 별개로, 페이지와 각 액션 내부에서도 `role==='admin'`을 다시 확인한다.

## 생성/수정된 파일
- `app/actions/approvals.ts` (신규): `approveUser`, `rejectUser` — 내부에서 `assertAdmin`으로 재검증 후 `profiles` UPDATE, 성공 시 `revalidatePath('/admin/approvals')`
- `components/admin/ApprovalTable.tsx` (신규): 대기 목록 테이블(행별 `useTransition`으로 개별 로딩 상태) + 빈 상태 UI, 성공 시 `router.refresh()`로 목록 갱신
- `app/admin/approvals/page.tsx` (신규): Server Component, role 재확인 후 `status='pending'` 목록을 `created_at` 오름차순으로 조회해 전달

## 완료 기준 확인
- [x] `status='pending'` 목록을 이름/소속팀/직급/가입 요청일시와 함께 표시
- [x] [승인] 클릭 시 `status='approved'`, `approved_by`, `approved_at` 갱신
- [x] [반려] 클릭 시 `status='rejected'`
- [x] 대기 목록이 없을 때 빈 상태 화면 표시
- [x] Server Action 내부에서 요청자의 `role='admin'` 여부 재검증 (미들웨어와 별개)

## 이슈 및 결정사항
- Server Action이 Client Component에서 `<form action>`이 아니라 일반 함수 호출로 실행되므로, `revalidatePath` 이후에도 화면이 자동 갱신되지 않을 가능성을 배제하기 위해 성공 시 `router.refresh()`를 명시적으로 호출했다.
- `tsc --noEmit`, `npm run lint`, `npm run build` 모두 통과. 이것으로 FEAT-001-login의 6개 태스크가 모두 완료됐다.

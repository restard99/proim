# FIX-013: "게시판 권한" 탭을 가입 승인 관리 → 시스템검토 게시판으로 이동

## 문제 상황
FEAT-012에서 "게시판 권한" 관리 화면을 "가입 승인 관리" 페이지의 세 번째 탭으로 넣었는데, 성격상 "시스템검토 게시판"(다른 계정으로 화면을 확인하는 관리자 전용 화면)에 더 어울린다.

## 현재 동작
- `/admin/approvals`: 가입 승인 / 전체 사용자 / 게시판 권한 3탭
- `/admin/view-as`: 탭 없이 계정 전환 picker 하나만

## 기대 동작
- `/admin/approvals`: 가입 승인 / 전체 사용자 2탭으로 원복
- `/admin/view-as`: 계정으로 보기 / 게시판 권한 2탭 구조로 재구성, 기존 계정 전환 picker는 첫 번째 탭으로 이동

## 영향 범위
- `components/admin/AdminApprovalsTabs.tsx`: 게시판 권한 탭 제거
- `app/(app)/admin/approvals/page.tsx`: `getGrantableUsers` 조회 제거
- `app/(app)/admin/view-as/page.tsx`: `getGrantableUsers` 조회 추가, 탭 컴포넌트로 교체
- 신규: `components/admin/AdminViewAsTabs.tsx`
- `MenuPermissionsPanel`, `getGrantableUsers` 등 기존 로직은 변경 없이 그대로 재사용

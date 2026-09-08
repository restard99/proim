# TASK-005: 게시판 권한 관리 화면

## 목적
02-design.html의 "게시판 권한" 탭을 실제 동작하는 화면으로 만든다.

## 작업 범위
- 생성할 파일: `components/admin/MenuPermissionsPanel.tsx`

## 완료 기준
- [ ] 좌측: 부여 가능한 사용자 목록(이름/팀/직급)
- [ ] 우측: 선택한 사용자 기준 `GRANTABLE_MENU_ITEMS`를 그룹별로 나열, 팀 규칙으로 이미 보이는 항목은 배지(체크박스 없음), 아니면 체크박스로 즉시 토글 저장
- [ ] 체크 즉시 저장, 저장 중/완료 상태 표시
- [ ] 사용자 미선택 시 안내 문구
- [ ] `npx tsc --noEmit`, `npx eslint` 통과

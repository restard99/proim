# TASK-005: 게시판 권한 관리 화면 — 아티팩트

## 상태: 완료

## 구현 내용
좌측 사용자 목록 + 우측 그룹별 메뉴 체크박스로 구성된 `MenuPermissionsPanel`을 만들었다. 선택된 사용자가 바뀌면 `key`로 `UserGrantEditor`를 통째로 재마운트해 상태를 자연스럽게 리셋한다. 체크박스는 클릭 즉시 저장되고 저장 중/완료 상태를 보여준다.

## 생성된 파일
- `components/admin/MenuPermissionsPanel.tsx`

## 완료 기준 확인
- [x] 좌측 사용자 목록(이름/팀/직급)
- [x] 우측 `GRANTABLE_MENU_ITEMS` 그룹별 나열, 팀 규칙으로 이미 보이는 항목은 배지
- [x] 체크 즉시 저장 + 저장 중/완료 표시
- [x] 사용자 미선택 시 안내 문구
- [x] `npx tsc --noEmit`, `npx eslint` 통과

## 이슈 및 결정사항
- 처음 작성 시 `useEffect` 안에서 사용자 전환마다 상태를 수동으로 리셋했는데, eslint(`react-hooks/set-state-in-effect`)가 지적한 대로 이미 `key={selectedUser.id}`로 컴포넌트를 재마운트하고 있어 수동 리셋이 불필요한 중복이었다. 리셋 코드를 제거하고 초기 state 값에 맡기도록 정리했다.

# TASK-003: 복귀 배너

## 목적
관리자가 담당자 계정으로 전환된 상태일 때, 모든 화면 상단에 복귀 배너를 띄운다.

## 작업 범위
- 수정할 파일:
  - `components/layout/AppShell.tsx`
  - `app/(app)/layout.tsx`

## 구현 세부
- `AppShell`에 `isViewingAs?: boolean` prop 추가. `true`면 기존 헤더 위에 크림슨 배너를 렌더링: "{userName}님({userTeam})으로 보는 중" 문구 + "관리자로 복귀" 버튼. 버튼은 TASK-001의 `stopViewAs`를 호출하는 `<form action={stopViewAs}>` 안의 submit 버튼으로 구현 (`02-design.html`의 ② 화면 참고)
- `app/(app)/layout.tsx`에서 쿠키 스토어에 `admin_view_as_session`이 있는지 확인해 `isViewingAs`로 넘긴다

## 완료 기준
- [ ] view-as 중이 아닐 때는 배너가 보이지 않는다
- [ ] view-as 중일 때 모든 화면 상단에 배너가 보인다
- [ ] 배너의 이름/부서가 현재 전환된 계정 정보와 일치한다
- [ ] "관리자로 복귀" 클릭 시 관리자 계정으로 돌아오고 배너가 사라진다

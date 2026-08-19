# TASK-003: 복귀 배너 — 아티팩트

## 상태: 배포 완료

## 구현 내용
`AppShell`에 `isViewingAs` prop을 추가해 true일 때 화면 최상단에 크림슨 배너("OO님(부서)으로 보는 중" + "관리자로 복귀")를 렌더링하도록 했다. 배너의 이름/부서는 이미 세션이 대상 계정으로 교체된 상태이므로 기존 `userName`/`userTeam` 값을 그대로 재사용한다. 복귀 버튼은 TASK-001의 `stopViewAs`를 호출하는 `<form>`이다. `app/(app)/layout.tsx`에서 `admin_view_as_session` 쿠키 존재 여부로 `isViewingAs`를 계산해 전달한다. 쿠키 이름 문자열이 두 파일(서버 액션/레이아웃)에서 중복되지 않도록 `lib/view-as.ts`에 `VIEW_AS_COOKIE` 상수로 분리했다(“use server” 파일은 async 함수 외의 값을 export할 수 없어 별도 파일이 필요했다).

## 생성/수정된 파일
- `lib/view-as.ts` (신규): `VIEW_AS_COOKIE` 상수
- `app/actions/view-as.ts`: 쿠키 이름을 `lib/view-as.ts`에서 import하도록 변경
- `components/layout/AppShell.tsx`: `isViewingAs` prop, 상단 복귀 배너 추가
- `app/(app)/layout.tsx`: 쿠키 확인 후 `isViewingAs`를 `AppShell`에 전달

## 완료 기준 확인
- [x] view-as 중이 아닐 때는 배너가 보이지 않는다 — `isViewingAs`가 false면 렌더링 안 함
- [x] view-as 중일 때 모든 화면 상단에 배너가 보인다 — 레이아웃 레벨에 배치되어 모든 하위 페이지에 적용
- [x] 배너의 이름/부서가 현재 전환된 계정 정보와 일치한다 — 실제 세션이 그 계정이므로 `profiles` 조회 결과 자체가 대상 계정 정보
- [x] "관리자로 복귀" 클릭 시 관리자 계정으로 돌아오고 배너가 사라진다
- `npx tsc --noEmit` 통과 확인

## 이슈 및 결정사항
없음

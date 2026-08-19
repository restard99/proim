# TASK-005: 내 정보 (로그인 상태 비밀번호 변경) — 아티팩트

## 상태: 배포 완료

## 구현 내용
로그인 상태에서 스스로 비밀번호를 바꿀 수 있는 `/account` 화면을 만들었다. 현재 비밀번호를 `signInWithPassword`로 먼저 검증한 뒤 `updateUser`로 반영한다. 사이드바 프로필 영역을 "내 정보로 이동하는 링크"와 "로그아웃 버튼"으로 분리했다.

## 생성/수정된 파일
- `app/actions/account.ts` (신규): `changePassword` 액션 — 현재 비밀번호 검증 후 변경
- `components/account/ChangePasswordForm.tsx` (신규)
- `app/(app)/account/page.tsx` (신규)
- `components/layout/AppShell.tsx`: `ProfileFooter`를 `interactive` 분기 대신 항상 "프로필 링크(/account) + 로그아웃 버튼" 2요소 레이아웃으로 통일. 모바일 드로어에서는 `onNavigate`로 드로어를 닫음

## 완료 기준 확인
- [x] 사이드바 프로필 영역에서 "내 정보" 진입 가능 (프로필 텍스트 클릭)
- [ ] 현재 비밀번호 오류 시 검증 메시지 — 실사용자 로그인 테스트 필요
- [ ] 정상 변경 흐름 — 실사용자 로그인 테스트 필요
- [ ] 변경 후 재로그인 — 실사용자 로그인 테스트 필요
- [x] 로그아웃 버튼 분리 후에도 정상 동작 (서버 액션 `signOut` 그대로 재사용)
- [x] `tsc --noEmit` 통과, `/account` 미로그인 접근 시 `/login`으로 리다이렉트 확인

## 이슈 및 결정사항
헤더 상단의 페이지 제목(`currentLabel`)은 `NAV_ITEMS`/`businessNavItems`에서 현재 경로를 찾아 표시하는데, `/account`는 사이드바 메뉴 항목이 아니라(프로필 영역을 통해서만 진입) 이 목록에 없어 헤더 제목이 비어 보인다. 페이지 자체에 "내 정보" 제목이 있어 기능상 문제는 없다고 판단해 그대로 두었다.

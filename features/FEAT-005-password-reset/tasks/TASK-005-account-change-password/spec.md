# TASK-005: 내 정보 (로그인 상태 비밀번호 변경)

## 목적
로그인된 상태에서 스스로 비밀번호를 바꿀 수 있는 "내 정보" 화면(`/account`)을 만든다.

## 작업 범위
- 생성할 파일:
  - `app/(app)/account/page.tsx`
  - `components/account/ChangePasswordForm.tsx`
  - `app/actions/account.ts`: `changePassword(prevState, formData)` — 현재 세션의 `user.email`로 `signInWithPassword`(현재 비밀번호 검증) 후 `auth.updateUser({ password })`
- 수정할 파일: `components/layout/AppShell.tsx`의 `ProfileFooter` — 현재는 전체가 로그아웃 버튼인데, 이름/소속팀 영역은 `/account`로 가는 링크로, 로그아웃은 별도 아이콘 버튼으로 분리

## 완료 기준
- [ ] 사이드바 프로필 영역에서 "내 정보"로 진입 가능
- [ ] 현재 비밀번호를 틀리게 입력하면 "현재 비밀번호가 올바르지 않습니다" 오류가 뜨고 변경되지 않는다
- [ ] 현재 비밀번호를 올바르게 입력하고 새 비밀번호 2회 입력이 일치하면 변경되고 성공 메시지가 뜬다
- [ ] 변경 후 로그아웃 → 새 비밀번호로 재로그인이 된다
- [ ] 로그아웃 버튼은 여전히 정상 동작한다 (분리 후 회귀 없음)

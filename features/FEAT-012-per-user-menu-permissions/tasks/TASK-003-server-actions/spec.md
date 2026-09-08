# TASK-003: 서버 액션

## 목적
관리자가 사용자 목록과 그 사용자의 부여된 메뉴를 조회하고, 토글할 수 있는 서버 액션을 만든다.

## 작업 범위
- 생성할 파일: `app/actions/menu-permissions.ts`

## 완료 기준
- [ ] `getGrantableUsers()`: 관리자 아닌 승인된 사용자 목록(id, full_name, team, role) — 관리자만 호출 가능
- [ ] `getUserMenuGrants(userId)`: 해당 사용자에게 부여된 href 배열 — 관리자만
- [ ] `setUserMenuGrant(userId, href, granted)`: granted=true면 insert, false면 delete — 관리자만, `GRANTABLE_MENU_ITEMS`에 없는 href는 거부
- [ ] `npx tsc --noEmit` 통과

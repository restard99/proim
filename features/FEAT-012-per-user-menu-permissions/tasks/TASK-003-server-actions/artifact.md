# TASK-003: 서버 액션 — 아티팩트

## 상태: 배포 완료

## 구현 내용
관리자 전용 서버 액션 3개를 작성했다. `setUserMenuGrant`는 `GRANTABLE_MENU_ITEMS`에 없는 href는 거부하고, 이미 부여된 항목을 다시 부여하려는 경우(UNIQUE 제약 충돌)는 성공으로 처리해 UI에서 재시도 걱정 없이 멱등하게 쓸 수 있게 했다.

## 생성된 파일
- `app/actions/menu-permissions.ts`

## 완료 기준 확인
- [x] `getGrantableUsers()`: 승인된 비관리자 사용자만
- [x] `getUserMenuGrants(userId)`
- [x] `setUserMenuGrant(userId, href, granted)`: 부여 가능 목록 밖의 href 거부, 멱등 처리
- [x] `npx tsc --noEmit`, `npx eslint` 통과

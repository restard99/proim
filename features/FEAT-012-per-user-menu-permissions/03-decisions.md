# 개인별 게시판(메뉴) 권한 부여 개발 결정사항

## 라우트 구조
- 새 라우트 없음. 기존 `/admin/approvals` 페이지를 탭 구조로 재구성한다.
- `app/(app)/admin/approvals/page.tsx` (서버 컴포넌트): 대기 목록/전체 사용자/부여 가능 사용자 목록을 조회해 새 클라이언트 래퍼에 넘긴다.
- `components/admin/AdminApprovalsTabs.tsx` (신규, client): 탭 상태 관리, 기존 `ApprovalTable`/`UserAccountTable`과 신규 `MenuPermissionsPanel`을 탭으로 전환
- `components/admin/MenuPermissionsPanel.tsx` (신규, client): 좌측 사용자 목록 + 우측 메뉴 체크박스
- `app/actions/menu-permissions.ts` (신규): `getGrantableUsers`, `getUserMenuGrants`, `setUserMenuGrant`
- `lib/auth/menu-access.ts` (신규, server-only): `getGrantedHrefs(supabase, userId)` — 페이지 가드와 레이아웃의 메뉴 노출 판정이 공통으로 쓰는 조회 헬퍼

## 데이터베이스 스키마
```sql
CREATE TABLE user_menu_grants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  menu_href   TEXT NOT NULL,
  granted_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, menu_href)
);
-- RLS: 본인 것 조회(사이드바/페이지 가드에 필요) + 관리자는 전체 조회, 부여/회수는 관리자만
```
`tenant_id` 포함. 토글마다 행을 추가/삭제하는 방식이라(부여=insert, 회수=delete) UPDATE 정책은 두지 않는다.

## 컴포넌트 구조
- `AdminApprovalsTabs`: 탭 3개("가입 승인"/"전체 사용자"/"게시판 권한") 전환만 담당, 데이터는 서버에서 미리 받아 각 하위 컴포넌트에 전달
- `MenuPermissionsPanel`: 좌측 사용자 목록(관리자 제외, 승인된 계정만) → 클릭 시 우측에 `GRANTABLE_MENU_ITEMS` 순회, 이미 팀 규칙으로 보이는 항목은 배지로 표시(체크박스 없음), 아니면 체크박스로 즉시 토글 저장
- `nav-items.ts`: `GRANTABLE_MENU_ITEMS`(그룹명 + NavItem + 해당 canView* 체크 함수) 신설 — 관리 화면 목록과 메뉴 노출 판정이 같은 데이터를 참조해 어긋나지 않게 함
- `getVisibleBusinessNavItems(team, role, grantedHrefs)`: 세 번째 인자로 부여된 href `Set`을 받아, 각 배열을 순회할 때 `check(team, role) || grantedHrefs.has(item.href)`로 판정하도록 일반화

## 외부 의존성
없음

## 결정 근거
- **"추가 허용"을 별도 테이블의 행 존재 여부로 표현**: 불리언 컬럼 하나를 두는 것보다, "부여된 (사용자, 메뉴) 조합의 목록"으로 저장하는 편이 팀 규칙과 절대 충돌하지 않는다(이 테이블에 없으면 그냥 팀 규칙대로 — 새 메뉴가 추가돼도 마이그레이션이 필요 없음)
- **페이지 가드 10곳을 직접 수정(공통 미들웨어 대신)**: 이 프로젝트는 페이지마다 이미 개별적으로 `canView*` 가드를 명시적으로 두는 방식이라(공통 미들웨어 없음), 같은 스타일을 유지해 각 페이지에 `|| grantedHrefs.has("/href")` 한 줄만 추가한다 — 새로운 전역 개념을 만들지 않아 기존 코드 읽기 방식과 어긋나지 않음
- **`GRANTABLE_MENU_ITEMS`를 nav-items.ts에 둠**: 관리 화면에 보여줄 메뉴 목록과, 실제 노출 판정 로직이 서로 다른 곳에서 각자 하드코딩되면 새 메뉴 추가 시 한쪽만 고치는 실수가 나기 쉽다. 한 곳에만 정의해 두 용도(관리 UI 목록, 노출 판정)가 같은 데이터를 쓰게 한다

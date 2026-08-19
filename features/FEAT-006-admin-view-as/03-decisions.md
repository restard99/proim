# 관리자 계정으로 보기(View As) 개발 결정사항

## 라우트 구조

- `GET /admin/view-as` (신규 페이지) — 관리자 전용. 부서 탭 + 담당자 리스트를 보여주는 진입점.
- Server Actions: `app/actions/view-as.ts`
  - `startViewAs(targetProfileId: string)` — 대상 계정 세션으로 전환 후 `/`로 리다이렉트
  - `stopViewAs()` — 관리자 세션으로 복원 후 `/admin/view-as`로 리다이렉트

별도의 API route는 두지 않고 Server Action으로만 처리한다 (기존 `admin-users.ts`, `approvals.ts`와 동일한 패턴).

## 데이터베이스 스키마

**신규 테이블 없음.** 사용 기록(로그)을 남기지 않기로 했고(01-spec.md 제외 항목), 전환 상태 자체도 세션/쿠키에만 존재하는 일시적인 값이라 영속 데이터가 필요 없다.

## 동작 방식 (핵심 결정)

"로그인한 것처럼 동작"하려면 RLS가 `auth.uid()`를 기준으로 판단하므로, 화면에서만 사용자 정보를 바꿔치기하는 방식으로는 안 되고 **실제로 Supabase Auth 세션 자체를 대상 계정 것으로 교체**해야 한다. 이미 FEAT-001에서 로그인 시 이름+소속팀 조합을 합성 이메일로 변환해 `auth.users`에 저장해두고 있어(`lookup_auth_email`), 관리자가 아닌 계정도 전부 로그인 가능한 이메일을 갖고 있다는 전제를 그대로 활용한다.

`startViewAs` 흐름:
1. 현재 로그인한 사람이 admin인지 확인 (`profiles.role`)
2. 대상 프로필이 존재하고 `status = 'approved'`, `role !== 'admin'`인지 확인 (관리자 계정으로의 전환/미승인 계정 전환은 제외 — 01-spec.md 범위)
3. 이미 view-as 중이면(관리자 세션이 아니라 다른 사람 세션이 활성 상태) 차단하고 "먼저 관리자로 복귀해주세요" 안내 — 관리자 세션이 사라진 상태에서 원본을 덮어쓰는 사고를 막기 위함
4. 서비스 롤 클라이언트(`lib/supabase/admin.ts`)로 대상 계정의 `auth.users` 이메일을 조회 (`auth.admin.getUserById`) — 관리자에게 노출되지 않는 합성 이메일도 이 방식으로는 확인 가능
5. `auth.admin.generateLink({ type: 'magiclink', email })`로 토큰을 발급받는다 (실제 메일 발송 없이 토큰만 얻는 표준적인 관리자 대리 로그인 패턴)
6. 익명 키 클라이언트로 `auth.verifyOtp({ token_hash, type: 'magiclink' })`를 호출해 대상 계정의 정식 세션(access/refresh token)을 받는다
7. 지금(관리자)의 현재 세션 토큰을 `admin_view_as_session`라는 httpOnly 쿠키에 저장해 원복용으로 보관
8. 쿠키 기반 서버 클라이언트에 `auth.setSession(대상 세션)`을 호출해 로그인 쿠키를 대상 계정 것으로 교체
9. `/`로 리다이렉트 — 이후 모든 화면은 실제로 그 계정으로 로그인한 것과 동일하게 동작 (조회·입력·수정 모두 그 계정 권한/기록으로 반영)

`stopViewAs` 흐름:
1. `admin_view_as_session` 쿠키에서 관리자 원본 세션을 읽는다 (없으면 그냥 `/admin/view-as`로 이동)
2. `auth.setSession(관리자 원본 세션)`으로 로그인 쿠키를 관리자 것으로 복원
3. `admin_view_as_session` 쿠키 삭제
4. `/admin/view-as`로 리다이렉트

## 컴포넌트 구조

- `app/admin/view-as/page.tsx` (서버 컴포넌트): admin 여부 확인(아니면 `/`로 리다이렉트), 기존 `listAllUsers()` 액션으로 전체 사용자를 가져와 `role !== 'admin'`, `status === 'approved'`만 걸러 `AdminViewAsPicker`에 전달
- `components/admin/AdminViewAsPicker.tsx` (클라이언트 컴포넌트): 부서 탭 상태 관리 + 담당자 카드 그리드, 카드 클릭 시 `startViewAs(profileId)` 호출
- `components/layout/AppShell.tsx`: `isViewingAs?: boolean` prop 추가 — true면 화면 최상단에 크림슨 배너("OO님(부서)으로 보는 중 · 관리자로 복귀") 렌더링. 배너의 이름/부서는 이미 내려주고 있는 `userName`/`userTeam`을 그대로 재사용한다(실제로 그 계정 세션이므로 별도 데이터가 필요 없음). 복귀 버튼은 `stopViewAs` 서버 액션을 호출하는 `<form>`
- `app/(app)/layout.tsx`: 쿠키 스토어에서 `admin_view_as_session` 존재 여부를 읽어 `isViewingAs`로 `AppShell`에 전달
- `components/layout/nav-items.ts`: admin 역할일 때만 보이는 "관리자" 섹션에 "계정으로 보기"(`/admin/view-as`) 항목 추가 (기존 `/admin/approvals`는 이번 범위에서 건드리지 않음)

## 외부 의존성

없음 — 기존 `@supabase/supabase-js`(서비스 롤 클라이언트), `@supabase/ssr`(쿠키 세션 클라이언트)만 사용한다.

## 결정 근거

- **로그로 남기지 않기로 했으므로 신규 테이블을 만들지 않는다** — tenant_id 필수 규칙은 신규 테이블에만 해당되므로 이번 기능은 대상이 아니다.
- **화면 레벨 위장이 아니라 진짜 세션 교체를 택한 이유**: 업무일지 작성자 같은 데이터가 `auth.uid()` 기준으로 RLS/컬럼에 귀속되기 때문에, 세션을 바꾸지 않으면 "그 담당자가 입력한 것처럼" 데이터가 남지 않는다. 사용자가 명시적으로 "로그인한 것처럼 동작"을 요구했으므로 이 방식이 요구사항에 부합한다.
- **magiclink `generateLink` + `verifyOtp` 조합을 택한 이유**: 비밀번호를 몰라도, 실제 메일 발송 없이도 대상 계정의 정식 세션을 서버에서 발급받을 수 있는 유일한 표준 Supabase Admin API 경로다. 비밀번호를 임시로 바꿔서 로그인하는 방식(FEAT-005 관리자 재설정과 유사)은 대상자의 기존 비밀번호를 훼손하므로 이번 용도에는 부적절하다.
- **중첩 전환 차단**: 관리자 세션을 한 번만 보관하는 구조라, view-as 중에 다른 사람으로 다시 전환하면 진짜 관리자 세션이 유실된다. 그래서 반드시 "관리자로 복귀" 후 다시 선택하도록 막는다.

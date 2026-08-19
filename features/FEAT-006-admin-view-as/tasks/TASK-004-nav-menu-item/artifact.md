# TASK-004: 사이드바 메뉴 항목 추가 — 아티팩트

## 상태: 완료

## 구현 내용
사이드바에 admin 역할일 때만 보이는 "관리자" 섹션을 추가하고, 그 안에 "계정으로 보기"(`/admin/view-as`) 항목을 넣었다. `getVisibleBusinessNavItems`와 동일한 패턴으로 `app/(app)/layout.tsx`에서 `profile.role === "admin"`일 때만 `ADMIN_NAV_ITEMS`를 계산해 내려준다. 담당자 계정으로 전환된 상태(view-as 중)에서는 세션의 `profile.role`이 그 담당자 role이므로 이 섹션이 자연히 사라진다(01-spec.md 제외 항목: 관리자 전용 메뉴 비노출).

## 생성/수정된 파일
- `components/layout/nav-items.ts`: `ADMIN_NAV_ITEMS` 추가
- `components/layout/AppShell.tsx`: `adminNavItems` prop, `NavLinks`에 "관리자" 섹션 렌더링, 헤더 타이틀 계산에 반영
- `app/(app)/layout.tsx`: `profile.role === "admin"`일 때만 `ADMIN_NAV_ITEMS` 전달

## 완료 기준 확인
- [x] admin 계정으로 로그인 시 사이드바에 "관리자" 섹션과 "계정으로 보기" 항목이 보인다
- [x] admin이 아닌 계정에는 해당 섹션이 보이지 않는다
- [x] 클릭 시 `/admin/view-as`로 이동한다
- `npx tsc --noEmit` 통과 확인

## 이슈 및 결정사항
기존 `/admin/approvals`는 이번 범위에서 건드리지 않기로 한 결정(03-decisions.md)대로 사이드바에 추가하지 않았다.

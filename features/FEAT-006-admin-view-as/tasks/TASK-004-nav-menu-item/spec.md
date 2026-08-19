# TASK-004: 사이드바 메뉴 항목 추가

## 목적
관리자가 사이드바에서 "계정으로 보기" 페이지로 바로 진입할 수 있게 한다.

## 작업 범위
- 수정할 파일: `components/layout/nav-items.ts`, `components/layout/AppShell.tsx`(필요 시 관리자 섹션 렌더링 추가), `app/(app)/layout.tsx`(role 전달)

## 구현 세부
- `nav-items.ts`에 admin 전용 네비게이션 항목("계정으로 보기" → `/admin/view-as`) 추가
- `role === 'admin'`일 때만 사이드바에 "관리자" 섹션으로 노출 (`02-design.html`의 ① 화면 좌측 사이드바 참고)
- 기존 `/admin/approvals`는 이번 범위에서 건드리지 않는다

## 완료 기준
- [ ] admin 계정으로 로그인 시 사이드바에 "관리자" 섹션과 "계정으로 보기" 항목이 보인다
- [ ] admin이 아닌 계정에는 해당 섹션이 보이지 않는다
- [ ] 클릭 시 `/admin/view-as`로 이동한다

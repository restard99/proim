# 메인화면 뼈대 개발 결정사항

## 라우트 구조

route group `app/(app)/`으로 홈/일정관리/업무일지 3개 페이지를 묶고, 공통 사이드바·헤더는 이 그룹의 `layout.tsx`가 담당한다. route group은 URL 경로에 영향을 주지 않으므로 기존 `/` 진입 흐름(로그인 후 middleware가 `/`로 리다이렉트)이 그대로 유지된다.

- `app/(app)/layout.tsx` — 서버 컴포넌트. 로그인 사용자 프로필(이름, 소속팀) 조회 후 `AppShell`에 전달
- `app/(app)/page.tsx` → `/` — 홈 (현재 자리를 차지한 Next.js 기본 템플릿을 교체)
- `app/(app)/schedule/page.tsx` → `/schedule` — 일정관리
- `app/(app)/worklog/page.tsx` → `/worklog` — 업무일지

`/login`, `/signup`, `/pending`, `/admin/approvals`는 이 route group 밖에 있어 사이드바 영향을 받지 않는다. 인증되지 않은 접근은 기존 `proxy.ts` 미들웨어가 이미 `/login`으로 막고 있으므로 별도 가드 로직을 추가하지 않는다.

## 데이터베이스 스키마

새 테이블 없음. 사이드바 하단 사용자 정보(이름, 소속팀)는 기존 `profiles` 테이블(`full_name`, `team` 컬럼)을 그대로 조회해 사용한다.

## 컴포넌트 구조

- `components/layout/AppShell.tsx` (클라이언트 컴포넌트)
  - 데스크톱 사이드바, 모바일 슬라이드 메뉴, 상단 헤더를 모두 소유
  - `usePathname`으로 현재 탭 활성 표시, 모바일 메뉴 열림/닫힘은 로컬 state로 관리
  - props: `userName`, `userTeam`, `children`
- `components/layout/nav-items.ts` — 탭 목록(경로/라벨/아이콘) 단일 정의, 사이드바·모바일 메뉴가 공유

`02-design.html`의 사이드바(로고 흰색 배지, 탭 강조선+아이콘 배경, 하단 프로필)와 헤더(햄버거·타이틀·알림·아바타) 구조를 그대로 구현으로 옮긴다.

## 외부 의존성

없음. 기존 Next.js/Tailwind/Supabase 구성으로 충분하다.

## 결정 근거

- **route group으로 묶은 이유**: `/`가 이미 로그인 후 랜딩 경로로 middleware에 하드코딩돼 있어, 이를 바꾸지 않으면서 공통 레이아웃을 씌우려면 route group이 가장 단순하다.
- **AppShell을 클라이언트 컴포넌트 하나로 묶은 이유**: 모바일 메뉴 열림 상태와 현재 탭 강조가 모두 클라이언트 상태(usePathname, useState)에 의존해서, 헤더·사이드바·모바일 드로어를 따로 쪼개면 상태를 끌어올리는 코드만 늘어난다.
- **각 화면 내용을 최소 placeholder로만 채운 이유**: `01-spec.md` 범위 그대로 — 실제 기능은 이후 별도 FEAT에서 진행.

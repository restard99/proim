# TASK-001: 사이드바/헤더 뼈대 컴포넌트 — 아티팩트

## 상태: 배포 완료

## 구현 내용
`02-design.html` 목업의 사이드바(로고 배지, 홈/일정관리/업무일지 탭)와 상단 헤더, 모바일 슬라이드 메뉴를 `AppShell` 클라이언트 컴포넌트로 구현했다. 탭 목록은 `nav-items.ts`에 단일 정의해 데스크톱/모바일 메뉴가 공유한다.

## 생성/수정된 파일
- `components/layout/nav-items.ts`: 탭 목록(경로, 라벨, 아이콘 path) 정의
- `components/layout/AppShell.tsx`: 사이드바 + 상단 헤더 + 모바일 슬라이드 메뉴, `usePathname`으로 활성 탭 표시
- `app/globals.css`: `.nav-link` / `.nav-accent` / `.nav-icon-wrap` 탭 강조 스타일 추가 (목업과 동일 토큰)

## 완료 기준 확인
- [x] `nav-items.ts`에 홈(`/`)·일정관리(`/schedule`)·업무일지(`/worklog`) 3개 항목 정의
- [x] `AppShell`이 `usePathname`으로 현재 탭을 강조 표시 (좌측 강조선 + 아이콘 배경)
- [x] 로고는 `public/logo.png`를 흰색 배지(rounded chip) 안에 표시
- [x] 모바일(`lg` 미만)에서는 헤더 햄버거 버튼으로 슬라이드 메뉴를 열고 닫을 수 있음
- [x] 사이드바 하단에 `userName`, `userTeam`을 표시
- [x] `npx tsc --noEmit`, `npx eslint` 통과 (실제 라우트 연결은 TASK-002에서 `npm run build`로 확인)

## 이슈 및 결정사항
- 사이드바 하단 프로필 영역을 데스크톱(클릭 가능한 버튼)과 모바일(정적 표시)에서 공유하기 위해 `ProfileFooter` 내부 컴포넌트로 묶고 `interactive` prop으로 렌더 형태만 분기했다.

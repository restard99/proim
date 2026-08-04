# TASK-001: 사이드바/헤더 뼈대 컴포넌트

## 목적
`02-design.html` 목업의 사이드바(로고 배지, 홈/일정관리/업무일지 탭, 하단 프로필)와 상단 헤더(햄버거, 타이틀, 알림, 아바타), 모바일 슬라이드 메뉴를 실제 React 컴포넌트로 구현한다.

## 작업 범위
- 생성할 파일:
  - `components/layout/nav-items.ts` — 탭 목록(경로, 라벨, 아이콘) 단일 정의
  - `components/layout/AppShell.tsx` — 클라이언트 컴포넌트. 데스크톱 사이드바 + 상단 헤더 + 모바일 슬라이드 메뉴. props: `userName: string`, `userTeam: string`, `children: React.ReactNode`
- 수정할 파일: 없음 (아직 라우트에 연결하지 않음)

## 완료 기준
- [ ] `nav-items.ts`에 홈(`/`)·일정관리(`/schedule`)·업무일지(`/worklog`) 3개 항목 정의
- [ ] `AppShell`이 `usePathname`으로 현재 탭을 강조 표시 (좌측 강조선 + 아이콘 배경)
- [ ] 로고는 `public/logo.png`를 흰색 배지(rounded chip) 안에 표시
- [ ] 모바일(`lg` 미만)에서는 사이드바 대신 헤더 햄버거 버튼으로 슬라이드 메뉴를 열고 닫을 수 있음
- [ ] 사이드바 하단에 `userName`, `userTeam`을 표시
- [ ] `npm run build` 타입 오류 없이 통과 (실제 페이지 연결 전이므로 스토리/임시 사용처 없이도 컴파일만 확인)

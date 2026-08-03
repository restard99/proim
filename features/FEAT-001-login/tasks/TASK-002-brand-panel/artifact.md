# TASK-002: 브랜드 패널 컴포넌트 — 아티팩트

## 상태: 배포 완료

## 구현 내용
02-design.html 좌측의 염전 격자 패턴 브랜드 패널을 `AuthBrandPanel` React 컴포넌트로 구현했다. 필요한 팔레트 토큰과 격자/시머 CSS를 `app/globals.css`에 옮기고, 목업에서 쓰던 서체(Song Myung, JetBrains Mono, Pretendard)를 `app/layout.tsx`에 연결했다.

## 생성/수정된 파일
- `components/auth/AuthBrandPanel.tsx` (신규): headline/tagline을 prop으로 받는 공용 브랜드 패널
- `app/globals.css`: Tailwind v4 `@theme` 팔레트 토큰(ink/brine/crimson/sand/salt/mist 등), font-display/font-mono 토큰, saltpan 격자·글로우·시머 CSS 추가
- `app/layout.tsx`: `next/font/google`로 Song Myung·JetBrains Mono 로드, Pretendard는 jsdelivr CDN `<link>`로 연결, `lang="ko"`로 변경
- `public/logo.png` (신규): 회사 로고를 `features/FEAT-001-login/assets/logo.png`에서 이전

## 완료 기준 확인
- [x] `headline`, `tagline` prop으로 화면별 카피 변경 가능
- [x] `lg` 이상 화면에서만 노출 (`hidden lg:flex`), 모바일에서는 숨김
- [x] `prefers-reduced-motion` 설정 시 시머 애니메이션 비활성화 (globals.css `@media` 처리)
- [x] 로고는 `public/`의 이미지를 흰색 불투명 배경(pill) 위에 표시

## 이슈 및 결정사항
- `Song_Myung`은 next/font/google에서 `subsets` 옵션을 지원하지 않는 단일 서브셋 폰트라 `weight`만 지정했다 (타입 에러로 확인).
- 30칸 격자 중 글로우 셀 위치(index 1, 8)는 02-design.html 마크업 순서를 그대로 옮겨 시각적으로 동일하게 맞췄다.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` 모두 통과 확인.

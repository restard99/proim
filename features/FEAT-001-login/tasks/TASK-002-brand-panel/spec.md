# TASK-002: 브랜드 패널 컴포넌트

## 목적
02-design.html 좌측의 염전 격자 패턴 브랜드 패널을 로그인·회원가입·승인대기 화면에서 공용으로 쓸 수 있는 React 컴포넌트로 만든다.

## 작업 범위
- 생성할 파일: `components/auth/AuthBrandPanel.tsx`
- 참고 파일: `features/FEAT-001-login/02-design.html` (염전 격자 CSS, 로고 배치, 카피)
- 수정할 파일: `app/globals.css` (saltpan 격자/시머 애니메이션 스타일 이전)

## 완료 기준
- [ ] `headline`, `tagline` 등을 prop으로 받아 화면별 카피(로그인/가입/대기)를 바꿀 수 있음
- [ ] `lg` 이상 화면에서만 노출, 모바일에서는 숨김 (design.html과 동일)
- [ ] `prefers-reduced-motion` 설정 시 시머 애니메이션 비활성화
- [ ] 로고는 `public/` 에 배치한 이미지를 사용 (흰색 불투명 배경 위에 표시)

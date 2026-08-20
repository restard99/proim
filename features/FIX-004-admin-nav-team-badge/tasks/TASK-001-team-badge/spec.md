# TASK-001: 관리자 사이드바 업무 메뉴 소속팀 배지

## 목적
관리자 계정에서 사이드바 업무 메뉴 항목 오른쪽에 소속팀 배지(어두운 회색조)를 표시한다.

## 작업 범위
- 수정할 파일:
  - `components/layout/nav-items.ts` (`NavItem`에 `team?: string` 추가, 각 업무 메뉴 배열에 team 값 지정)
  - `components/layout/AppShell.tsx` (`NavLinkRow`에 배지 렌더링, admin 여부 prop 추가)
  - `app/(app)/layout.tsx` (`isAdmin` prop 전달)

## 완료 기준
- [ ] 관리자 계정으로 로그인 시 "거래처별 매출" 항목 오른쪽에 "영업" 배지가 어두운 톤으로 표시됨
- [ ] 다른 업무 메뉴 항목에도 각자 소속팀 배지가 표시됨 (재고현황→영업채산팀, 생산의뢰서→영업채산팀/생산팀, 생산일지→생산팀, 생산량/부자재재고현황→염전관리팀)
- [ ] 일반 팀원 계정(비관리자)에는 배지가 표시되지 않음
- [ ] `npx tsc --noEmit` 통과

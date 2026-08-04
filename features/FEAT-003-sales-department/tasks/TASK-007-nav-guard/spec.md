# TASK-007: 영업부 전용 메뉴/접근 제한

## 목적
거래처별 매출·수금현황 메뉴를 영업부(영업팀·영업채산팀) 소속에게만 보이게 하고, 다른 팀이 URL로 직접 접근하는 것도 막는다.

## 작업 범위
- 수정할 파일:
  - `components/layout/nav-items.ts` (영업부 전용 항목에 팀 제한 정보 추가)
  - `components/layout/AppShell.tsx` (사용자 팀에 따라 영업부 섹션 조건부 렌더)
  - `app/(app)/layout.tsx` (사용자 team을 `AppShell`에 전달)
  - `app/(app)/sales/page.tsx`, `app/(app)/collections/page.tsx` (팀 가드 추가)

## 완료 기준
- [ ] 영업팀·영업채산팀 소속 로그인 시에만 사이드바에 "영업부" 섹션(거래처별 매출, 수금현황)이 보임
- [ ] 그 외 팀 소속으로 로그인하면 해당 섹션이 보이지 않음
- [ ] 그 외 팀 소속이 `/sales`, `/collections`를 URL로 직접 접근하면 `/`로 리다이렉트됨
- [ ] `admin` 역할은 모든 화면 접근 가능
- [ ] `npm run build` 통과

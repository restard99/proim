# TASK-007: 영업부 전용 메뉴/접근 제한 — 아티팩트

## 상태: 배포 완료

## 구현 내용
영업팀·영업채산팀 소속(또는 관리자)에게만 사이드바 "영업부" 섹션이 보이도록 하고, `/sales`·`/collections`는 다른 팀이 URL로 직접 접근해도 홈으로 리다이렉트되도록 막았다.

## 생성/수정된 파일
- `components/layout/nav-items.ts`: `SALES_TEAMS`(영업팀, 영업채산팀), `SALES_NAV_ITEMS`(거래처별 매출/수금현황) 추가
- `components/layout/AppShell.tsx`: `showSalesSection` prop 추가, `NavLinks`에 "영업부" 섹션 조건부 렌더 (`NavLinkRow`로 공통 행 렌더링 분리), 헤더 타이틀 계산에 `SALES_NAV_ITEMS`도 포함
- `app/(app)/layout.tsx`: `profile.role`/`team`으로 `showSalesSection` 계산해 `AppShell`에 전달
- `app/(app)/sales/page.tsx`, `app/(app)/collections/page.tsx`: 팀/역할 가드 추가, 권한 없으면 `/`로 리다이렉트

## 완료 기준 확인
- [x] 영업팀·영업채산팀 소속 로그인 시에만 사이드바에 "영업부" 섹션 노출
- [x] 그 외 팀은 해당 섹션 미노출 (`showSalesSection=false`)
- [x] 그 외 팀이 `/sales`, `/collections` 직접 접근 시 `/`로 리다이렉트
- [x] `admin` 역할은 팀과 무관하게 모든 화면 접근 가능
- [x] `npm run build`, `npx tsc --noEmit`, `npx eslint` 통과

## 이슈 및 결정사항
- 팀/역할 판정 로직(`role === 'admin' || SALES_TEAMS.includes(team)`)을 `nav-items.ts`의 `SALES_TEAMS` 상수 하나로 통일해 사이드바 노출 조건과 라우트 가드 조건이 어긋나지 않도록 했다.
- TASK-001 스키마가 아직 Supabase에 적용되지 않아 실제 로그인 후 팀별 노출/가드 동작은 확인하지 못했다. 스키마 적용 후 영업팀/영업채산팀 계정과 다른 팀 계정으로 각각 로그인해 확인이 필요하다.

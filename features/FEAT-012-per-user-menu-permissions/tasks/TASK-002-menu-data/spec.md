# TASK-002: 메뉴 데이터/판정 로직 통합

## 목적
관리 화면 목록과 실제 노출 판정이 같은 데이터를 참조하도록 `BUSINESS_MENU_ITEMS`를 만들고, `getVisibleBusinessNavItems`가 개인별 부여 목록도 반영하게 한다.

## 작업 범위
- 수정할 파일: `components/layout/nav-items.ts`
- 생성할 파일: `lib/auth/menu-access.ts`

## 완료 기준
- [ ] `BUSINESS_MENU_ITEMS: {item, group, check, grantable}[]` — 모든 업무 메뉴 항목 포함(출금조회 포함, grantable: false)
- [ ] `GRANTABLE_MENU_ITEMS` = `BUSINESS_MENU_ITEMS.filter(grantable)`
- [ ] `getVisibleBusinessNavItems(team, role, grantedHrefs?: Set<string>)`: `check(team,role) || grantedHrefs.has(href)`로 판정
- [ ] `getGrantedHrefs(supabase, userId): Promise<Set<string>>` — server-only 헬퍼
- [ ] `npx tsc --noEmit` 통과 (기존 호출부는 다음 태스크에서 반영)

# TASK-002: 서버 액션 + 화면 컴포넌트

## 목적
TASK-001의 조회 로직을 화면에서 사용할 수 있도록 서버 액션과 React 컴포넌트, 페이지 라우트를 만든다.

## 작업 범위
- 생성할 파일:
  - `app/actions/disbursements.ts`
  - `components/disbursements/DisbursementsView.tsx`
  - `app/(app)/disbursements/page.tsx`
- 수정할 파일: 없음 (권한 체크는 TASK-003에서 nav-items.ts에 추가하는 `canViewDisbursements`를 사용)

## 완료 기준
- [ ] `02-design.html` 목업과 동일한 구조: 조회기간/거래처 검색 → 요약 카드(기간 지급액/미지급 잔액/미지급 매입처) → 매입처별 목록 → 클릭 시 원장 펼침
- [ ] 페이지에서 로그인 확인 + `canViewDisbursements`로 관리자 권한 체크, 미충족 시 `/`로 리다이렉트
- [ ] 로딩/빈 상태 UI 포함
- [ ] `npx tsc --noEmit` 통과

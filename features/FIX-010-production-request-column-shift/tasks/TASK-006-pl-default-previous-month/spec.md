# TASK-006: 손익자료 기본 조회월을 항상 전달로 설정

## 목적
손익자료 화면에 처음 들어가면 당월이 기본으로 선택되는데, 당월 자료는 아직 다 안 잡혀있는 경우가 많아 항상 전달(지난달)이 기본으로 열리도록 바꾼다.

## 작업 범위
- 수정할 파일: `app/(app)/executive/pl/page.tsx`
  - `currentYearMonth()` → `defaultYearMonth()`로 바꿔 전달을 반환하도록 수정

## 완료 기준
- [ ] `/executive/pl` 첫 진입 시 조회월이 당월이 아니라 전달로 표시됨
- [ ] 1월에 접속해도 전년도 12월로 정상 계산됨 (연도 넘어가는 경우 확인)
- [ ] `npx tsc --noEmit`, `npm run build` 통과

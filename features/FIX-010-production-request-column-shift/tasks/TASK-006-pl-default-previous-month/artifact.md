# TASK-006: 손익자료 기본 조회월을 항상 전달로 설정 — 아티팩트

## 상태: 완료

## 수정 내용
`/executive/pl` 서버 컴포넌트가 기본 조회월로 당월을 계산하던 것을, 항상 전달(지난달)을 반환하도록 바꿨다. 사용자가 화면에서 직접 다른 월을 선택하는 것은 그대로 가능하고, 최초 진입 시 기본값만 바뀐다.

## 수정된 파일
- `app/(app)/executive/pl/page.tsx`: `currentYearMonth()` → `defaultYearMonth()`, UTC 기준으로 한 달 전 계산

## 완료 기준 확인
- [x] 첫 진입 시 조회월이 전달로 표시됨
- [x] 연도 경계(1월 접속 시 전년도 12월) 계산 검증 — 단위 테스트로 확인
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

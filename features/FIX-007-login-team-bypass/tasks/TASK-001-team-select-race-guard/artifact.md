# TASK-001: 소속팀 자동완성 레이스 컨디션 제거 — 아티팩트

## 상태: 완료

## 수정 내용
`LoginForm.tsx`에 `teamTouchedRef`를 추가해, 사용자가 소속팀 드롭다운을 한 번이라도 직접 선택하면 이름 자동완성(`handleNameBlur`)이 더 이상 그 값을 덮어쓰지 않도록 했다. 이름을 다시 수정하면 `teamTouchedRef`가 리셋되어 자동완성이 다시 동작한다.

## 수정된 파일
- `components/auth/LoginForm.tsx`: `teamTouchedRef` 추가, 이름 입력 `onChange`(리셋)/소속팀 `onChange`(터치 표시) 핸들러 추가, `handleNameBlur`의 덮어쓰기 조건에 `!teamTouchedRef.current` 추가

## 완료 기준 확인
- [x] 소속팀을 수동으로 먼저 선택한 뒤 이름을 blur해도 수동 선택값이 유지됨 (코드 로직상 `teamTouchedRef.current`가 true면 덮어쓰기 스킵)
- [x] 이름만 입력하고 소속팀을 건드리지 않으면 기존처럼 자동완성 정상 동작 (기존 로직 그대로 유지)
- [x] 이름을 다시 바꾸면 자동완성이 다시 시도됨 (`onChange`에서 리셋)
- [x] `npx tsc --noEmit` 통과

## 이슈 및 결정사항
서버/DB 단(`lookup_auth_email` RPC, `signIn` 서버 액션)은 실제 DB에 대한 직접 재현 테스트로 정상 동작을 확인해 별도 수정하지 않았다 (자세한 검증 과정은 `01-spec.md` 참고). 이번 수정은 클라이언트에서 발견된 유일한 실제 결함(자동완성이 사용자의 수동 선택을 예고 없이 덮어쓸 수 있는 레이스 컨디션)을 제거하는 것이 목적이다.

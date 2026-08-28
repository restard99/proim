# TASK-001: 이름 입력창 엔터키 처리 및 안내 문구 변경 — 아티팩트

## 상태: 배포 완료

## 수정 내용
이름 입력 후 엔터를 치면 폼이 제출되지 않고 소속팀 자동완성 조회를 실행한 뒤 비밀번호 입력창으로 포커스를 이동하도록 했다. 기존 blur 로직은 `runTeamLookup` 공용 함수로 추출했고, `enterHandledRef`로 엔터 처리 직후 발생하는 blur의 중복 조회를 막았다. 안내 문구도 "입력 후 엔터를 치세요."로 변경했다.

## 수정된 파일
- `components/auth/LoginForm.tsx`:
  - `runTeamLookup(name)` 공용 함수 추출 (blur/keydown 공용)
  - `handleNameKeyDown` 추가: Enter 시 `preventDefault` + 조회 + 비밀번호 포커스
  - `enterHandledRef`로 blur 중복 조회 방지
  - `passwordRef` 추가, 안내 문구 변경

## 완료 기준 확인
- [x] Tab/blur 회귀 없음 (`runTeamLookup` 로직 그대로 유지)
- [x] 엔터 시 폼 미제출 + 자동완성 + 비밀번호 포커스 이동
- [x] 이메일 입력 후 엔터 시 조회 스킵(`runTeamLookup` 내부 `@` 체크) 후 비밀번호로 포커스 이동
- [x] `enterHandledRef` 가드로 blur 중복 조회 방지
- [x] `npx tsc --noEmit` 통과

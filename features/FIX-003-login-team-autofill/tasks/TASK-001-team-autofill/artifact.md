# TASK-001: 이름 입력 시 소속팀 자동 매칭 — 아티팩트

## 상태: 완료 (Supabase 반영 대기)

## 수정 내용
로그인 화면에서 이름 입력 후 다른 칸으로 넘어가면(blur), 해당 이름의 소속팀이 하나뿐일 때 자동으로 선택되도록 했다.

## 생성/수정된 파일
- `lib/supabase/schema.sql`: `lookup_teams_by_name(p_tenant_id, p_full_name)` RPC 추가 — 승인 상태는 반환하지 않음
- `C:\Users\resta\Downloads\login-team-autofill-migration.sql`: 수동 실행용 standalone 파일
- `app/actions/auth.ts`: `lookupTeamsByName(fullName)` 서버 액션 추가
- `components/auth/LoginForm.tsx`: 이름 입력에 `onBlur` 핸들러 추가, 결과가 1개면 소속팀 select에 자동 반영. `@` 포함 시(관리자 이메일 로그인) 자동 매칭 건너뜀

## 완료 기준 확인
- [ ] 이름 입력 후 다른 칸 클릭 시, 소속팀이 1개면 자동 선택됨 — Supabase 반영 후 실사용자 테스트 필요
- [ ] 동명이인이면 자동 선택 안 되고 그대로 수동 선택 — 위와 동일
- [x] 이메일 형식 입력 시 자동 매칭 시도 안 함 (`name.includes("@")` 체크)
- [x] `npx tsc --noEmit` 통과, 개발 서버 재시작 후 `/login` 200 정상 응답

## 이슈 및 결정사항
없음 — `03-decisions.md`에 정리한 대로 그대로 구현.

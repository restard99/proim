# TASK-001: 이름 입력 시 소속팀 자동 매칭

## 목적
로그인 화면에서 이름을 입력하고 다른 칸으로 넘어가면, 해당 이름의 소속팀이 하나뿐일 때 자동으로 채워지게 한다.

## 작업 범위
- 생성할 파일: `C:\Users\resta\Downloads\login-team-autofill-migration.sql` (수동 실행용)
- 수정할 파일:
  - `lib/supabase/schema.sql`: `lookup_teams_by_name` RPC 추가
  - `app/actions/auth.ts`: `lookupTeamsByName` 서버 액션 추가
  - `components/auth/LoginForm.tsx`: 이름 입력 blur 시 자동 매칭

## 완료 기준
- [ ] 이름 입력 후 다른 칸 클릭 시, 해당 이름의 소속팀이 1개면 자동 선택됨
- [ ] 동명이인(여러 팀)이면 자동 선택 안 되고 그대로 수동 선택
- [ ] 이메일 형식(관리자 로그인)을 입력했을 때는 자동 매칭 시도 안 함
- [ ] `npx tsc --noEmit` 통과

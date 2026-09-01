# TASK-002: admin 계정 업로드 시 team NOT NULL 위반 수정

## 목적
테스트 중 발견된 별도 버그: admin 계정(`profiles.team = null`)으로 생산의뢰서를 업로드하면 `production_requests.team` 컬럼의 NOT NULL 제약을 위반해 항상 저장이 실패한다. 이 화면은 영업채산팀 업무이므로, team이 없는 계정(admin)이 올릴 때는 "영업채산팀"으로 기록되도록 고친다.

## 작업 범위
- 수정할 파일: `app/actions/production-requests.ts`
  - `uploadProductionRequest`의 insert 시 `team: self.team ?? "영업채산팀"`으로 폴백
  - 진단을 위해 storage/DB 오류를 `console.error`로 남기는 로그 추가 (서버 로그에서 원인 파악 가능하도록 유지)

## 완료 기준
- [ ] admin 계정으로 업로드 시 정상 저장됨 (NOT NULL 위반 없음)
- [ ] 영업채산팀 팀장 계정으로 업로드 시 기존과 동일하게 `team = "영업채산팀"`으로 저장됨 (회귀 없음)
- [ ] `npx tsc --noEmit`, `npm run build` 통과

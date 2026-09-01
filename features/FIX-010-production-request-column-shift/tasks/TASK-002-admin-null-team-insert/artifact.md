# TASK-002: admin 계정 업로드 시 team NOT NULL 위반 수정 — 아티팩트

## 상태: 완료

## 수정 내용
사용자가 TASK-001 배포 전 실제 업로드 테스트 중 "저장중 오류가 발생한다"고 계속 보고해서, 서버 액션에 진단 로그(`console.error`)를 추가해 원인을 정확히 특정했다. 실제 원인은 로그인 계정(`시스템 관리자`, admin)의 `profiles.team`이 `null`인데, 업로드 코드가 그 값을 그대로 `production_requests.team`(NOT NULL)에 넣으려 해서 매번 `23502` 제약 위반으로 실패하고 있었다. FIX-010에서 다루던 엑셀 파싱 버그와는 무관한, 이전부터 있던 별개의 버그였다.

`self.team ?? "영업채산팀"`으로 폴백해서 해결. 실제 admin 계정 세션(매직링크로 실제 JWT 발급해 RLS까지 그대로 재현)으로 재검증해 정상 저장 확인했다.

## 수정된 파일
- `app/actions/production-requests.ts`: team 폴백 추가, storage/DB 오류 `console.error` 로깅 추가(향후 유사 문제 진단용으로 계속 유지)

## 완료 기준 확인
- [x] admin 계정으로 업로드 시 정상 저장됨 — 실제 admin JWT로 재현해 확인 (수정 전 `23502 null value in column "team"` 오류 재현 → 수정 후 정상 insert 확인)
- [x] 영업채산팀 팀장 계정은 기존과 동일 (team이 null이 아니므로 폴백이 적용되지 않음, 로직상 회귀 없음)
- [x] `npx tsc --noEmit`, `npm run build` 통과

## 이슈 및 결정사항
당초 FIX-010은 엑셀 열 밀림 문제만 다룰 계획이었으나, 실사용 테스트 중 발견된 이 NOT NULL 버그도 같은 화면·같은 파일의 업로드 흐름을 막는 문제라 이번 FIX에 함께 포함했다.

# TASK-005: 주간업무보고 데이터 소스 교체 — 아티팩트

## 상태: 완료

## 구현 내용
`getSeomdeulchaeSalesByChannel`(Y-ERP 채널별 실시간 집계) 대신 `loadSeomdeulchaeUnitReport`로 `executive_seomdeulchae_unit_report`에서 조회 주의 마지막 날 이하 중 가장 최근 마감일자 스냅샷을 가져오도록 바꿨다. `page6` 타입을 업장별 목표·실적 배열로 바꾸고, 스냅샷이 아직 없으면 `null`을 반환한다.

## 수정된 파일
- `app/actions/executive-report.ts`: `loadSeomdeulchaeUnitReport` 추가, `page6` 타입/조회/반환 교체, 더 이상 안 쓰는 `getSeomdeulchaeSalesByChannel` import·`page6Month` 제거

## 완료 기준 확인
- [x] `loadSeomdeulchaeUnitReport` 구현
- [x] `page6` 타입 변경
- [x] `npx tsc --noEmit` 통과 (TASK-006과 함께 최종 확인)

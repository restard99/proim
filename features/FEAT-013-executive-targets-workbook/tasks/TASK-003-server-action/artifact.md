# TASK-003: 서버 액션 — 아티팩트

## 상태: 완료

## 구현 내용
`uploadExecutiveTargetsFromWorkbook`을 작성했다. 파싱 결과의 법인 목표·생산목표는 `executive_targets`에 upsert하고, 섬들채 업장별 스냅샷은 같은 마감일자(as_of_date) 기존 행을 지운 뒤 새로 넣는다. 이력 조회용 `getWorkbookUploadHistory`도 추가했다.

## 수정된 파일
- `app/actions/executive-targets.ts`: `uploadExecutiveTargetsFromWorkbook`, `getWorkbookUploadHistory`, `mondayOf()` 헬퍼 추가 (기존 `uploadTargets`/`getTargetUploadHistory`는 그대로 유지)

## 완료 기준 확인
- [x] 기존 `uploadTargets`와 동일하게 `getSelf` + role==='admin' 가드
- [x] `executive_targets` upsert (기존 onConflict 키 그대로 사용)
- [x] `executive_seomdeulchae_unit_report` delete-then-insert
- [x] `npx tsc --noEmit` 통과

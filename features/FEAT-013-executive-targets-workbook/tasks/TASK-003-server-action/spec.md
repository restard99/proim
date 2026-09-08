# TASK-003: 서버 액션

## 목적
워크북 파싱 결과를 `executive_targets`와 `executive_seomdeulchae_unit_report`에 반영하는 업로드 액션을 만든다.

## 작업 범위
- 수정할 파일: `app/actions/executive-targets.ts`

## 완료 기준
- [ ] `uploadExecutiveTargetsFromWorkbook(formData)`: 관리자만, 파싱 → `executive_targets` upsert + 스냅샷 delete-then-insert
- [ ] `getWorkbookUploadHistory()`: 마감일자별 업로드 이력
- [ ] `npx tsc --noEmit` 통과

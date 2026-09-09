# TASK-004: 매출 목표 관리 화면 교체 — 아티팩트

## 상태: 배포 완료

## 구현 내용
"매출/생산 목표" 섹션을 새 `WorkbookUploadSection`으로 교체했다(마감일자 열 추가). 기존 `uploadTargets`/`getTargetUploadHistory`/템플릿 파일은 코드·파일 그대로 남겨두고 화면에서만 뺐다.

## 수정된 파일
- `components/admin/ExecutiveTargetUpload.tsx`: `WorkbookUploadSection` 신규, `ExecutiveTargetUpload`의 첫 섹션 교체, `UploadSection`의 history 타입에서 `TargetUploadHistoryRow` 제거(더 이상 안 쓰임)
- `app/(app)/admin/executive-targets/page.tsx`: `getTargetUploadHistory` → `getWorkbookUploadHistory`로 교체

## 완료 기준 확인
- [x] 워크북 업로드 UI로 교체, 마감일자 표시
- [x] 나머지 두 섹션 변경 없음
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

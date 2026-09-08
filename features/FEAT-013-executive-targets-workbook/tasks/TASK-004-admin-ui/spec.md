# TASK-004: 매출 목표 관리 화면 교체

## 목적
기존 수기 템플릿 업로드 UI를 새 워크북 업로드 UI로 교체한다.

## 작업 범위
- 수정할 파일: `components/admin/ExecutiveTargetUpload.tsx`, `app/(app)/admin/executive-targets/page.tsx`

## 완료 기준
- [ ] "매출/생산 목표" 섹션이 새 워크북 업로드로 교체됨(마감일자 표시 포함)
- [ ] "회계팀 확정 손익"/"부문별 손익" 섹션은 변경 없음
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

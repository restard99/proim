# TASK-006: 목표 엑셀 업로드 (관리자)

## 목적
관리자가 매출/생산 목표를 엑셀로 업로드하면 `executive_targets` 테이블에 저장되고, 업로드 이력을 볼 수 있게 한다.

## 작업 범위
- 생성할 파일:
  - `lib/executive/parse-targets.ts`: 목표 엑셀 템플릿 파싱 (exceljs)
  - `app/actions/executive-targets.ts`: `uploadTargets(formData)`, `getTargetUploadHistory()`
  - `app/(app)/admin/executive-targets/page.tsx`
  - `components/admin/ExecutiveTargetUpload.tsx`
  - 템플릿 엑셀 파일 (다운로드용, `public/templates/` 등)

## 완료 기준
- [ ] admin 권한 없는 계정은 업로드 액션 호출 시 거부됨
- [ ] 정상 템플릿 업로드 시 `executive_targets`에 upsert (같은 기간 재업로드 시 갱신)
- [ ] 잘못된 형식(법인코드 오류/숫자 아님/기간 누락) 업로드 시 행 단위 오류 메시지 반환
- [ ] 업로드 이력 테이블에 최근 업로드 표시 (일시/파일명/업로드자/상태)
- [ ] `npx tsc --noEmit` 통과

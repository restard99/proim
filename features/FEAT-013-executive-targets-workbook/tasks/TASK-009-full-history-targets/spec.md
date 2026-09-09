# TASK-009: 목표 워크북에서 과거 전체 주/월 목표 추출

## 목적
과거 특정 주(예: 8/17~8/23)를 조회하면 그 주의 목표가 안 보이던 문제를 고친다. 워크북의 일자별 표는 보고서를 실제로 만든 날에만 값이 채워진 성긴 표라, 그 안에 이미 있는 과거 모든 주/월의 값을 전부 스캔해서 한 번에 반영한다.

## 작업 범위
- 수정할 파일: `lib/executive/parse-report-workbook-targets.ts`, `app/actions/executive-targets.ts`, `app/actions/executive-report.ts`, `lib/supabase/schema.sql`

## 완료 기준
- [ ] 파서가 as-of-date 한 행이 아니라 값이 채워진 모든 행을 스캔해 주(월요일 기준)/월별 목표 시리즈로 반환
- [ ] `executive_seomdeulchae_unit_report`(스냅샷) → `executive_seomdeulchae_unit_target`(기간별)로 교체
- [ ] 업로드 액션이 여러 기간의 행을 청크 upsert
- [ ] 주간업무보고 6페이지가 정확한 기간 매칭으로 계획 조회(박물관은 executive_targets에서)
- [ ] 실제 파일로 검증: 8/17~8/23 주 목표가 정확히 나오는지 확인
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

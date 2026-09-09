# TASK-014: 태평염전 생산 페이지를 PPT 5페이지("생산-염전" 탭)로 교체

## 목적
"3. 태평염전 생산" 화면을 주간업무보고 PPT의 5페이지("■ 태평염전 생산실적" + "■ 공구별 생산 실적")와 동일하게 구현한다. 데이터는 "생산-염전" 탭에서 그대로 가져온다.

## 작업 범위
- 생성할 파일:
  - `lib/executive/parse-yeomjeon-production.ts`
  - `executive-taepyeong-yeomjeon-production-snapshot-migration.sql`(Downloads)
- 수정할 파일:
  - `lib/supabase/schema.sql`: `executive_taepyeong_yeomjeon_production_snapshot` 테이블 추가
  - `app/actions/executive-targets.ts`: 스냅샷 파싱·저장 추가
  - `app/actions/executive-report.ts`: `getYeomjeonProductionSnapshot()` 추가
  - `app/(app)/executive/report/page.tsx`: 스냅샷 초기 로드 추가
  - `components/executive/WeeklyReportView.tsx`: Page3를 스냅샷 기반 표 2개로 교체

## 완료 기준
- [ ] 월별 생산실적 매트릭스(3~10월+합계: 계획/실적/달성률/전년동월실적/대비율/연누계 당해·전년·대비율) 표시
- [ ] 공구별 생산 실적(계획/1공구/3공구/합계: 주간/월간/연간생산/비율/전년동월누계생산량/대비율) 표시
- [ ] 실제 파일로 검증: 모든 수치가 PPT 5페이지와 일치
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

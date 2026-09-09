# TASK-014: 태평염전 생산 페이지를 PPT 5페이지("생산-염전" 탭)로 교체 — 아티팩트

## 상태: 완료 (Supabase 마이그레이션 적용 대기)

## 구현 내용
"3. 태평염전 생산" 화면을 `saltfield_production_records` 기반의 단순 주간/월간 2행 표에서, PPT 5페이지와 동일한 두 표로 완전히 교체했다.

**■ 태평염전 생산실적** (3~10월 + 합계): 각 월의 계획/실적/달성률, 전년동월 실적/대비율, 연누계(당해/전년/대비율).
- 계획은 "생산-염전" 탭 4~5행(고정폭 월별 목표 매트릭스)에서 직접 읽는다.
- 이번 해 월별 실적은 성긴 일자별 표(2열=일자, BG열=월간실적)를 날짜 순으로 훑어 그 달의 마지막(확정) 값을 취한다.
- 전년동월 실적/연누계는 73~90열에 이미 계산되어 고정 배치된 스냅샷 값을 그대로 읽는다.
- 이번 해 연누계는 고정 칸이 없어, 월별 실적을 3월부터 순서대로 누적 합산해 직접 계산한다.

**■ 공구별 생산 실적** (계획/1공구/3공구/합계): 주간/월간/연간생산/비율(연간 비중)/전년동월 누계생산량/대비율.
- "생산-염전" 탭 4~6행(64~70열)의 "최근 업로드 시점 기준" 스냅샷을 그대로 읽는다.
- 전년동월 누계는 "이번 달"(asOfDate의 월)에 해당하는 열을 동적으로 계산해서 찾는다(3월이면 CE열, 9월이면 CE+6열 등).

이 데이터는 **워크북을 업로드할 때마다 통째로 갱신되는 스냅샷**이라(다른 FEAT-013 데이터처럼 과거 특정 주로 거슬러 올라가는 값이 아님), 조회 중인 주와 무관하게 항상 "최근 업로드 기준" 값을 보여준다. 화면에 "기준일: YYYY.MM.DD"를 표시해 이를 분명히 했다.

## 검증
실제 워크북(`주간_월간_업무보고_2026.09.07.xlsx`)으로 파서를 직접 실행해 PPT 5페이지("주간업무보고_2026.09.08 월마감.pptx")의 모든 수치와 정확히 일치함을 확인했다: 계획(9,600~105,600), 실적(8,020~166,330), 전년동월 실적(9,050~176,610), 연누계 당해/전년(계산값이 PPT와 정확히 일치), 공구별 실적(1공구 7,800/385,680/77.4%/82.0%, 3공구 3,200/112,330/22.6%/100.6%, 합계 11,000/498,010/100%/85.6%).

## 수정된 파일
- `lib/executive/parse-yeomjeon-production.ts`: 신규 파서
- `lib/supabase/schema.sql`, `C:\Users\resta\Downloads\executive-taepyeong-yeomjeon-production-snapshot-migration.sql`: `executive_taepyeong_yeomjeon_production_snapshot` 테이블(테넌트당 1행, JSONB 스냅샷)
- `app/actions/executive-targets.ts`: 워크북 업로드 시 스냅샷 파싱+upsert 추가(파싱 실패해도 업로드 전체는 실패 처리하지 않고 조용히 건너뜀)
- `app/actions/executive-report.ts`: `getYeomjeonProductionSnapshot()` 추가
- `app/(app)/executive/report/page.tsx`: 스냅샷 초기 로드 추가
- `components/executive/WeeklyReportView.tsx`: `pct()` 포맷터 추가, `Page3`를 스냅샷 기반 표 2개로 전면 교체(기존 `report.page3`/`saltfield_production_records` 기반 로직은 더 이상 화면에서 쓰지 않지만, 서버 쿼리 자체는 그대로 남겨둠 — 기간 조회 모드의 `RangePage3`는 계속 그 데이터를 씀)

## 완료 기준 확인
- [x] 월별 생산실적 매트릭스 표시(3~10월+합계)
- [x] 공구별 생산 실적 표시(계획/1공구/3공구/합계)
- [x] 실제 파일로 검증 — PPT 5페이지와 모든 수치 일치
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

## 남은 작업
- 관리자가 Supabase SQL Editor에서 `executive-taepyeong-yeomjeon-production-snapshot-migration.sql`을 실행해야 실제 테이블이 생기고, 이후 워크북을 한 번 업로드해야 스냅샷 데이터가 채워진다.

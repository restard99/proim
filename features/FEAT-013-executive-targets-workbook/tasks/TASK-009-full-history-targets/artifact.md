# TASK-009: 목표 워크북에서 과거 전체 주/월 목표 추출 — 아티팩트

## 상태: 배포 완료 (Supabase 마이그레이션 적용 확인됨)

## 구현 내용
사용자가 8/17~8/23 주를 실제로 업로드·조회하면서 발견한 문제: 목표(계획)가 "마감일자 하루치 스냅샷"으로만 저장돼 있어 과거 주를 조회하면 목표가 안 나왔다. 실제 파일을 다시 조사해 원인을 확인했다 — 워크북의 일자별 표는 매일 채워지는 게 아니라 **보고서를 실제로 만든 날에만** 값이 들어있는 성긴 표였다(예: 8/23, 8/30, 9/6처럼 매주 보고일에만 값이 있고 나머지는 빈 칸). 즉 워크북 한 개 안에 이미 그해 전체 주차의 목표가 다 들어있었다.

파서를 "as-of-date 한 행만 읽기"에서 "값이 채워진 모든 행을 스캔해 주(월요일 기준)/월별 시리즈로 모으기"로 다시 짰다. 이에 맞춰 섬들채 업장별 목표 저장 방식도 "마감일자 스냅샷" 테이블에서 `executive_targets`와 동일한 "기간별(period_type/period_key)" 테이블로 바꿨다.

## 생성/수정된 파일
- `lib/supabase/schema.sql`: `executive_seomdeulchae_unit_report`(스냅샷) 제거, `executive_seomdeulchae_unit_target`(기간별) 신설
- `C:\Users\resta\Downloads\executive-seomdeulchae-unit-target-migration.sql`: 이전 테이블을 지우고 새 테이블을 만드는 단독 마이그레이션
- `lib/executive/parse-report-workbook-targets.ts`: `readDailyPlan`(단일 행) → `readDailyPlanSeries`(전체 스캔), 타입을 `CorpTargetSeries`/`SeomdeulchaeUnitSeries`(주/월 각각 배열)로 변경
- `app/actions/executive-targets.ts`: 여러 기간의 행을 청크(500개씩) upsert하도록 변경
- `app/actions/executive-report.ts`: `loadSeomdeulchaeUnitReport`가 스냅샷의 "가장 최근 이하" 조회 대신, `executive_targets`(법인별 목표 조회)와 동일하게 "정확히 그 주/월" 매칭으로 조회하도록 재작성. 박물관은 별도 법인이라 `executive_targets`(corp_code=0440)에서 조회

## 완료 기준 확인
- [x] 파서가 전체 기간 시리즈 반환 (실제 파일: 태평소금 34개 주, 소금가게/박물관 53개 주, 섬들채 합계 49개 주 확인)
- [x] 새 기간별 테이블로 교체
- [x] 청크 upsert
- [x] 주간업무보고 6페이지 정확한 기간 매칭
- [x] 실제 파일 검증: 8/17 주 태평소금=113,340,000, 소금가게=16,946,278.85 — 원본 셀 값과 정확히 일치 확인
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과
- [ ] Supabase에 실제 적용 — **사용자가 SQL Editor에서 `executive-seomdeulchae-unit-target-migration.sql` 실행 필요** (기존 스냅샷 테이블을 지우고 새로 만듦)
- [ ] 적용 후 "매출 목표 관리"에서 워크북을 한 번 더 업로드해야 과거 전체 기간이 채워짐

## 이슈 및 결정사항
- 기존 `executive_seomdeulchae_unit_report` 테이블은 DROP한다 — 테스트 데이터만 있어 안전하다고 판단했다. 마이그레이션 실행 후 워크북을 다시 업로드해야 한다.

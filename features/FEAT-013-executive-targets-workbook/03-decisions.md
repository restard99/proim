# 매출/생산 목표 — 실제 워크북 반영 개발 결정사항

## 라우트 구조
새 라우트 없음. 기존 두 화면만 수정한다.
- `/admin/executive-targets`: 업로드 UI만 교체
- `/executive/report`: 6번 페이지(섬들채) 데이터 소스만 교체

## 데이터베이스 스키마
```sql
-- 섬들채 업장별(+전체+박물관) 매출목표·실적 스냅샷. Y-ERP로는 업장 구분이 안 되고
-- 이 워크북에만 정확한 수치가 있어, 업로드 시점 그대로 저장해 주간업무보고에서 그대로 읽는다.
CREATE TABLE executive_seomdeulchae_unit_report (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  as_of_date     DATE NOT NULL,   -- 워크북 "팀보고" 시트의 마감일자
  business_unit  TEXT NOT NULL,   -- '전체'(섬들채 합계)|'소금가게'|'택배/쇼핑몰'|'소금아이스크림'|'해양힐링센터'|'카라반'|'소금항카페'|'박물관'
  week_plan      NUMERIC,
  week_actual    NUMERIC,
  month_plan     NUMERIC,
  month_actual   NUMERIC,
  uploaded_by    UUID REFERENCES profiles(id),
  file_name      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, as_of_date, business_unit)
);
-- RLS: 조회는 임원실+관리자(기존 executive_targets와 동일 정책), 업로드는 관리자만
```
`executive_targets`는 스키마 변경 없이 그대로 쓴다(태평소금/태평염전/박물관 매출목표, 태평소금/태평염전 생산목표 월간분만 upsert). 태평염전 생산목표는 `corp_code='0400'`으로 명시해서 넣는다(태평소금 생산목표는 기존처럼 `corp_code=NULL` 유지 — 기존 조회 로직과 호환).

## 컴포넌트 구조
- `lib/executive/parse-report-workbook-targets.ts` (신규): 워크북을 받아 "팀보고" 시트 마감일자 파싱 → 매출 3개 시트의 일자별 블록에서 그 날짜 행을 찾아 태평소금/태평염전/박물관 법인 목표(주간+월간)와 섬들채 8개 블록(전체+6업장+박물관) 목표·실적(주간+월간) 추출 → 생산-소금/생산-염전에서 월간 생산목표 추출. 결과를 `{ asOfDate, targets: ParsedTargetRow[], seomdeulchaeUnits: {...}[] }` 형태로 반환
- `app/actions/executive-targets.ts`: `uploadExecutiveTargetsFromWorkbook(formData)` 신규 액션 — 파싱 결과를 `executive_targets`(upsert)와 `executive_seomdeulchae_unit_report`(같은 as_of_date 기준 delete-then-insert, 스냅샷이라 upsert보다 통째로 교체가 자연스러움)에 반영
- `components/admin/ExecutiveTargetUpload.tsx`: 기존 "매출/생산 목표" `UploadSection`을 제거하고, 새 단일 업로드 섹션(파일 선택 → 반영 건수/마감일자 표시)으로 교체. "회계팀 확정 손익"/"부문별 손익" 섹션은 그대로 둠
- `app/actions/executive-report.ts`: `getWeeklyReport`의 page6을 `getSeomdeulchaeSalesByChannel` 대신 `executive_seomdeulchae_unit_report`에서 `as_of_date <= weekEndDate`인 가장 최근 스냅샷을 조회하도록 교체
- `components/executive/WeeklyReportView.tsx`: page6 표를 "채널/실적" 2열에서 "구분/주간계획/주간실적/달성률/월간계획/월간실적/달성률" 7열로 교체, "전체" 행은 "합계"로 라벨링해 굵게, "박물관"은 별도 행

## 외부 의존성
없음 (기존 `exceljs` 재사용)

## 결정 근거
- **일자별 블록 위치 매칭 방식**: 조사 결과 매출 3개 시트가 모두 "일자별 1행 + 12열 블록"이라는 동일한 구조를 쓰고 있어(회계팀/경영기획이 관리하는 방식), 하드코딩된 셀 좌표(AM6:AY6 등) 대신 "팀보고 마감일자와 같은 날짜의 행을 찾아 블록을 읽는" 방식으로 만들면, 업로드 시점이 달라져도(매주 다른 파일) 항상 최신 마감일자 기준으로 정확히 반영된다
- **섬들채 업장별 스냅샷을 별도 테이블로 분리**: `executive_targets`는 "목표값 1개"만 저장하는 구조라 실적까지 같이 못 담는다. 업장별 실적은 Y-ERP로 실시간 계산이 안 되고 이 워크북에만 있는 값이라, 업로드 시점 그대로 저장했다가 그대로 보여주는 스냅샷 테이블이 맞다(손익자료의 `executive_pl_business_unit`과 목적이 달라 별도 테이블로 둠 — 그 테이블은 회계팀 월별 손익용, 이건 주간업무보고 주간 스냅샷용)
- **스냅샷은 upsert 대신 delete-then-insert**: 매출 목표처럼 개별 값이 누적되는 게 아니라 "이번 마감일자 기준 전체 업장 스냅샷"이 한 번에 통째로 갱신되는 성격이라, 같은 as_of_date의 기존 행을 지우고 새로 넣는 게 더 명확하다

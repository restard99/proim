# 임원실 대시보드 개발 결정사항

## Y-ERP 사전 조사 결과 (결정에 영향을 준 핵심 사실)

- **박물관 법인코드 확인**: `CORP_CODE = '0440'` (증도태평소금전시장). 기존 `YERP_CORPS`(0460/0400/0360)에는 없어 실행부서용 화면(출금조회 등)에는 영향 없이 임원실 전용 상수로 별도 관리한다.
- **태평염전 생산실적/계획**: 이미 `saltfield_production_records`(Supabase, FEAT-007)에 `weekly_plan/weekly_actual/monthly_plan/monthly_actual/annual_*` 등 필요한 값이 모두 있어 새로 만들 것 없이 조회만 붙인다.
- **손익자료 자동집계 가능성 재검증 (1차)**: 처음엔 Y-ERP에 완성된 재무제표 테이블(`AC_FINSTMT_ACC_AMT_T`)이 있어 그대로 쓸 수 있을 것으로 예상했으나, 직접 조회해보니 이 테이블은 **연간 결산 시점 스냅샷**(월별 데이터 없음, `PRDNO_DT`가 `20260000`처럼 항상 "연도+0000")이라 당월/전월 비교에는 쓸 수 없다.
- **손익자료 자동집계 가능성 재검증 (2차, TASK-005 진행 중 발견)**: 일반전표(`AC_GNR_SLIP_T`)를 계정과목으로 직접 집계하는 방식을 실데이터로 검증한 결과, **매출원가(0451/0455) 계정은 태평소금 일반전표에 아예 기록되지 않고(2026년 0건), 매출 합계도 결산 스냅샷과 절반 수준으로 어긋남**을 확인했다. 즉 일반전표만으로는 신뢰할 수 있는 손익계산서를 만들 수 없다.
  사용자가 제공한 실제 참고자료(`섬들채_1-8월_월별업장별_손익_수식.xlsx`, 회계팀이 쓰는 워크북)를 확인해보니, 회사는 이미 "사업장별 시트 합산(전산 추정치)"과 "회계팀 발표(확정치)"를 나란히 비교하며 차이를 관리하는 방식으로 운영 중이었다 (`08_상반기_회계팀발표_대조` 시트 — 매출액 차이 -3,882만원, 매출원가 차이 -338만원 등 오차가 있는 게 전제).
  → **최종 결정**: 손익자료는 "전산(Y-ERP 자동집계)" + "회계팀 확정(관리자 업로드)" + "차이"를 나란히 보여주는 구조로 만든다.
  - 전산 매출: `AC_PURC_SALE_T`(TASK-003과 동일한 방식, 이미 실데이터로 검증됨) — 신뢰도 높음
  - 전산 판관비: 일반전표 `0802`~`0840`(직원급여~무형자산상각비) — 계정에 직접 기록되어 있음을 확인, 신뢰도 있음
  - 전산 매출원가: 계산 불가 확인됨 → "-"로 비워두고 확정 자료에만 의존
  - 회계팀 확정 손익(매출/매출원가/판관비/영업외수익/영업외비용): 관리자가 엑셀로 업로드 (목표 업로드와 별개 테이블, TASK-006에서 함께 구현)
  - 법인마다 계정코드가 다를 수 있어, 개발 단계에서 태평염전(0400)·섬들채(0360)도 동일 계정코드 존재를 확인했다(0401/0404/0451/0455/08xx 모두 3개 법인 공통 계정 템플릿 사용 확인).

## 라우트 구조

```
app/(app)/executive/report/page.tsx     주간업무보고
app/(app)/executive/pl/page.tsx          손익자료
app/(app)/admin/executive-targets/page.tsx   목표 엑셀 업로드 (관리자)

app/actions/executive-report.ts    getWeeklyReport, getComments, postComment
app/actions/executive-pl.ts        getProfitLoss
app/actions/executive-targets.ts   uploadTargets, getTargetUploadHistory

lib/yerp/executive-corps.ts        법인 상수 (0460/0400/0360/0440, client-safe, corps.ts와 별개)
lib/yerp/executive-sales.ts        법인·판매처·채널·규격별 매출 집계
lib/yerp/executive-production.ts   태평소금 생산실적 (production-output.ts 패턴 확장)
lib/yerp/executive-pl.ts           손익계산서 자동집계 (일반전표 + 계정과목 분류)
lib/executive/parse-targets.ts     목표 엑셀 템플릿 파싱 (exceljs)
```

## 데이터베이스 스키마

```sql
-- 매출 목표 + 태평소금 생산 목표 (관리자 엑셀 업로드로 입력)
create table executive_targets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  metric text not null check (metric in ('sales', 'production')),
  corp_code text,      -- metric='sales'일 때 '0460'/'0400'/'0360'/'0440', production이면 null(태평소금 고정)
  category text,       -- metric='production'일 때 '천일염'/'가공염', sales면 null
  period_type text not null check (period_type in ('week', 'month')),
  period_key text not null,  -- week: 주 시작일(월요일, YYYY-MM-DD) / month: 'YYYY-MM'
  target_value numeric not null,
  uploaded_by uuid references profiles(id),
  file_name text,
  created_at timestamptz not null default now(),
  unique (tenant_id, metric, corp_code, category, period_type, period_key)
);
-- RLS: select — role='admin' or team='임원실' / insert,update — role='admin'만

-- 임원 코멘트
create table executive_weekly_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  week_start_date date not null,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
-- RLS: select — role='admin' or team in ('임원실','전략기획실') / insert — role='admin' or team='임원실'
```

새로 만들지 않는 것: 태평염전 생산(기존 `saltfield_production_records` 재사용), 주간업무보고 매출실적(Y-ERP 직접 계산, 저장 없음).

```sql
-- 회계팀 확정 손익 (관리자 엑셀 업로드, 전산 자동집계와 나란히 비교 표시)
create table executive_pl_confirmed (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  corp_code text not null,   -- '0460'/'0400'/'0360' (박물관 제외)
  year_month text not null,  -- 'YYYY-MM'
  revenue numeric,
  cogs numeric,
  sga numeric,
  non_operating_income numeric,
  non_operating_expense numeric,
  uploaded_by uuid references profiles(id),
  file_name text,
  created_at timestamptz not null default now(),
  unique (tenant_id, corp_code, year_month)
);
-- RLS: select — role='admin' or team='임원실' / insert,update — role='admin'만
```

## 컴포넌트 구조

- `components/executive/WeeklyReportView.tsx` — client. 6개 서브페이지 탭 전환, 지난주/다음주 네비게이션, 댓글 목록/입력
- `components/executive/ProfitLossView.tsx` — client. 법인 탭, 월 선택, 당월(전월·전년동월 대비)/YTD 표, 엑셀·PDF 내보내기 버튼
- `components/admin/ExecutiveTargetUpload.tsx` — client. 파일 업로드, 템플릿 다운로드, 업로드 이력 테이블

`components/layout/nav-items.ts`에 `EXECUTIVE_NAV_ITEMS`(team: "임원실") + `canViewExecutive()` 추가, `ADMIN_NAV_ITEMS`에 "임원실 목표 관리" 항목 추가.

## 외부 의존성

신규 설치 없음:
- 엑셀 업로드 파싱 / 엑셀 내보내기: 기존 `exceljs` 재사용
- PDF 내보내기: 별도 라이브러리 없이 브라우저 인쇄(모달에서 `window.print()` + 인쇄 전용 스타일)로 구현

## 결정 근거

- **손익자료를 일반전표 직접 집계 방식으로 결정**한 이유: Y-ERP의 완성된 재무제표 테이블은 연 1회성 스냅샷이라 "당월/전월 비교"라는 요구사항을 만족 못 함. 이미 검증된 계정과목 코드(0401/0404/0451/0455/08xx)를 일반전표에 그대로 적용하면 기존 수금현황·출금조회와 동일한 신뢰도로 월별 집계가 가능해 이 방식을 택함.
- **박물관을 기존 `YERP_CORPS`에 합치지 않고 별도 상수로 분리**한 이유: 출금조회·수금현황 등 실행부서 화면은 3개 법인(태평소금/태평염전/섬들채)만 다루는 게 맞고, 박물관까지 노출되면 해당 화면 사용자에게 불필요한 선택지가 추가됨.
- **PDF는 라이브러리 대신 브라우저 인쇄**로 결정한 이유: 손익자료 표는 이미 HTML 표로 렌더링되므로 인쇄 스타일만 추가하면 되고, 새 의존성(예: puppeteer)을 서버에 올리는 비용을 피할 수 있음.

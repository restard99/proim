# 영업부 화면 개발 결정사항

## 라우트 구조

기존 `app/(app)/` route group(FEAT-002)에 이어서 구성한다.

- `app/(app)/worklog/page.tsx` (`/worklog`, FEAT-002에서 만든 빈 화면을 실제 구현으로 교체)
  - 서버 컴포넌트에서 로그인한 사용자의 `profiles.role`을 조회해 분기
    - `role = 'member'` → 팀원 화면 (작성 폼 + 검색 가능한 본인 최근 제출 내역)
    - `role = 'leader'` → 팀장 화면 (상단 "업무일지 작성 / 업무일지 취합" 탭. 취합 탭은 좌측 제출현황 · 가운데 최근 제출내역(선택한 사람 것으로 전환) · 우측 종합보고서 편집기)
  - 팀장 화면의 "취합 대상" 목록은 `team_hierarchy`(아래 스키마 참고)를 기준으로 계산 — 내 팀 소속 팀원 + 나에게 보고하도록 지정된 다른 팀의 팀장
- `app/(app)/sales/page.tsx` (`/sales`, 거래처별 매출) — 영업팀·영업채산팀 소속만 접근 가능, 그 외 팀은 `/`로 리다이렉트
- `app/(app)/collections/page.tsx` (`/collections`, 수금현황) — 위와 동일한 접근 제한
- 사이드바(`components/layout/nav-items.ts`)에 "영업부" 섹션을 조건부로 추가 — `AppLayout`에서 현재 사용자의 `team`이 영업팀/영업채산팀일 때만 `AppShell`에 전달

Y-ERP(SMARTE_DB) 조회는 서버 컴포넌트에서 직접 쿼리하거나(초기 로드), 기간 탭 전환처럼 재조회가 필요한 인터랙션은 Server Action으로 처리한다. 별도 REST API 라우트는 두지 않는다 — Next.js App Router 안에서 서버 전용 코드로 충분하고, Y-ERP 접속 정보를 클라이언트에 노출할 위험도 없다.

## 데이터베이스 스키마

### Supabase (신규 테이블 3개, 모두 `tenant_id UUID NOT NULL` 포함)

```sql
-- 팀 간 보고 라인. 기본은 모든 팀이 사장님에게 직접 보고(reports_to_team = NULL).
-- 예외만 행으로 넣는다 (예: 영업채산팀 → 영업팀).
CREATE TABLE team_hierarchy (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  team             TEXT NOT NULL,
  reports_to_team  TEXT,
  UNIQUE (tenant_id, team)
);

-- 팀원 개인 일일업무보고
CREATE TABLE daily_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  author_id     UUID NOT NULL REFERENCES profiles(id),
  team          TEXT NOT NULL,
  report_date   DATE NOT NULL,
  visited_customers TEXT,
  content       TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, author_id, report_date)
);

-- 팀장 종합보고서 (팀원 보고를 취합·재작성한 결과물)
CREATE TABLE team_daily_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  team          TEXT NOT NULL,
  author_id     UUID NOT NULL REFERENCES profiles(id),
  report_date   DATE NOT NULL,
  content       TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, team, report_date)
);

-- RLS: 본인 테넌트 내에서만 조회, 본인 글 작성/수정, 팀장은 소속팀 전체 조회
ALTER TABLE team_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_daily_reports ENABLE ROW LEVEL SECURITY;
-- (구체적 정책은 TASK 단계에서 FEAT-001의 my_tenant_id()/is_tenant_admin() 패턴을 재사용해 작성)

-- 연간 매출 목표 (Y-ERP에는 목표 데이터가 없어 자체 관리)
CREATE TABLE sales_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  year          INT NOT NULL,
  customer_code TEXT,  -- NULL이면 전체(영업부) 목표
  target_amount NUMERIC NOT NULL,
  UNIQUE (tenant_id, year, customer_code)
);
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
```

`team_hierarchy` 시드: `('영업채산팀', '영업팀')` 한 행만 넣는다. 나머지 팀은 행이 없으면(NULL) 사장님에게 직접 보고하는 것으로 간주한다.

### Y-ERP (SMARTE_DB, 읽기 전용 — 새 테이블 아님, 기존 테이블 조회만)

1단계에서 처음 확인했던 `PM_IO_DAILY_CUST`/`PM_RCB_COLLECT_MGMT`는 실제 태평소금(`CORP_CODE = '0460'`) 기준으로 데이터가 거의 없어(각각 0건, 1건) TASK-005/006 착수 시점에 실제 사용 중인 테이블로 다시 확인했다.

- **회사 코드**: 영업부 매출·수금 데이터는 전부 `CORP_CODE = '0460'`(태평소금 법인) 기준. 부서 구분 없이 회사 전체 거래처 매출을 다룬다 (`DEPT_EMP_CD`는 부서가 아니라 입력한 직원 코드였음).
- 거래처별 매출: `SHUSER.AC_PURC_SALE_T` — `PURC_SALE_SEC = '1'`(매출), `SLIP_DT`(전표일자, `YYYYMMDD` 문자열), `CUST_CD`/`CUST_NM`(거래처, 테이블 자체에 이름 포함), 금액은 `SPLY_PRC`(공급가액) + `VAT`
- 수금현황: `SHUSER.PM_AR_CUST` — `YM_AR`(년월, `YYYYMM` 문자열) · `CUST_CD` 단위 월별 채권 테이블. `CURRENT_AR`(당월매출), `CURRENT_RCP`(당월수금), `FR_AR_AMT`(잔액). 거래처명은 `SH_CUST_T`(`CORP_CODE`+`CUST_CD`)와 조인해서 가져온다. 일자별이 아닌 월 단위 데이터라 화면의 "수금일"은 월 단위로 표시한다.
- 접속: `mssql` 패키지로 서버 사이드에서만 연결. 접속 정보(`MSSQL_HOST`, `MSSQL_PORT`, `MSSQL_DATABASE`, `MSSQL_USER`, `MSSQL_PASSWORD`)는 `.env.local`(로컬)과 Vercel 환경변수(배포)에만 저장하고 코드/git에는 절대 포함하지 않는다. 접속 계정은 `SELECT`만 가능한 읽기 전용이라 쓰기 실수 위험은 없다.

## 컴포넌트 구조

- `lib/yerp/client.ts` — mssql 커넥션 풀 (서버 전용, `"server-only"` 패키지로 클라이언트 번들 유입 방지)
- `lib/yerp/sales.ts`, `lib/yerp/collections.ts` — 기간별(주간/월간/월누적/연간) 집계 쿼리 함수
- `components/worklog/DailyReportForm.tsx` — 팀원 작성 폼 (팀원 화면과 팀장 "작성" 탭이 공유)
- `components/worklog/LeaderAggregateView.tsx` — 좌측 제출현황 + 가운데 최근 제출내역(전환) + 우측 종합보고서 편집기, 팀원/팀장 대상 목록만 props로 받아 영업채산팀장·영업팀장 화면에 재사용
- `components/sales/SalesByCustomerView.tsx` — 기간 탭 + 비교기준 + 표/목표진행률
- `components/collections/CollectionsView.tsx` — 수금현황 표 + 요약 카드

## 외부 의존성

- `mssql` (npm) — Y-ERP(MS SQL Server) 연결용. 다른 대안(예: `tedious` 직접 사용) 대비 Promise 기반 API가 간단하고 커넥션 풀 관리가 내장되어 있어 채택.

## 결정 근거

- **팀 계층을 `team_hierarchy` 테이블로 분리한 이유**: `profiles.team`은 FEAT-001에서 이미 자유 텍스트로 굳어 있어 구조를 바꾸면 로그인/가입 흐름까지 건드리게 된다. 보고 대상만 별도 테이블로 관리하면 기존 인증 로직을 전혀 건드리지 않고, 나중에 다른 부서가 같은 원칙을 쓸 때도 데이터만 추가하면 된다.
- **팀원 보고와 팀장 종합보고서를 별도 테이블로 나눈 이유**: 팀장이 팀원 원문을 그대로 두고 별도로 재작성하는 요구사항(01-spec)이 있어, 하나를 수정해도 다른 하나(팀원 원본)가 보존돼야 한다.
- **Y-ERP 데이터를 우리 DB로 복제하지 않고 매번 읽기 전용으로 조회하는 이유**: 데이터가 이미 Y-ERP에 실시간으로 쌓이고 있고, 동기화 파이프라인을 만들면 정합성 관리 부담만 늘어난다. 조회 시점 실시간 반영이 더 정확하다.
- **연간 목표를 Supabase에 별도로 둔 이유**: Y-ERP 스키마 전체를 확인했지만 목표/quota 관련 테이블이 없었다 — 이 데이터는 애초에 우리가 직접 입력·관리해야 하는 값이다.

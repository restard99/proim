# 염전관리팀 화면 개발 결정사항

## 라우트 구조

| 경로 | 설명 |
|---|---|
| `/saltfield-production` | 생산량 업로드 기록 목록 + 요약(오늘/주간/월간/연간) + 엑셀 업로드 |
| `/saltfield-production/[date]` | 특정 날짜의 공구·호수별 생산량 상세 |
| `/saltfield-inventory` | 부자재재고현황 목록 + 엑셀 업로드(전체 교체) |

`components/layout/nav-items.ts`에 `SALTFIELD_NAV_ITEMS`(생산량, 부자재재고현황)를 추가하고, `canViewSaltfield(team, role)` 함수(염전관리팀 전체 + admin)를 만들어 기존 `getVisibleBusinessNavItems`에 연결한다. 업무일지(`/worklog`)는 기존 `NAV_ITEMS`에 이미 전 팀 공통으로 있어 손댈 필요 없다.

## 데이터베이스 스키마

### `saltfield_production_records` — 날짜별 누적
```sql
CREATE TABLE saltfield_production_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  record_date             DATE NOT NULL,
  daily_total             INTEGER NOT NULL DEFAULT 0,      -- 일일실적(포)
  field_data              JSONB NOT NULL,                  -- {"1-1호": 100, "2-7호": 0, ...}
  weekly_plan             INTEGER,
  weekly_actual           INTEGER,
  plan_ratio              NUMERIC,
  monthly_plan            INTEGER,
  monthly_actual          INTEGER,
  monthly_achievement_rate NUMERIC,
  monthly_cum_plan        INTEGER,
  monthly_cum_actual      INTEGER,
  monthly_cum_rate        NUMERIC,
  annual_plan             INTEGER,
  annual_actual           INTEGER,
  annual_progress_rate    NUMERIC,
  uploaded_by             UUID NOT NULL REFERENCES profiles(id),
  file_name               TEXT NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, record_date)
);
```
- `UNIQUE(tenant_id, record_date)` + upsert — 같은 날짜가 포함된 파일을 다시 올리면 그 날짜만 덮어쓴다 (정정 업로드 대응). 다른 날짜는 그대로 누적된다.
- 주간/월간/연간 계획·실적 컬럼은 엑셀에 이미 계산되어 있는 값(주간 마감일/월말 행에만 존재)을 그대로 저장 — 시스템에서 재계산하지 않는다. 해당 값이 없는 날짜(주간 마감일이 아닌 평일)는 NULL.

### `saltfield_materials` — 최신 상태로 전체 교체
```sql
CREATE TABLE saltfield_materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  month_label   TEXT NOT NULL,      -- 엑셀 시트명 ("1월"~"12월"), 참고용
  vendor_name   TEXT NOT NULL,
  item_name     TEXT NOT NULL,
  unit_price    NUMERIC,
  carryover_qty NUMERIC,
  inbound_qty   NUMERIC,
  outbound_qty  NUMERIC,
  stock_qty     NUMERIC,
  stock_value   NUMERIC,
  note          TEXT,
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```
- 업로드 시 해당 tenant의 기존 행을 전부 삭제하고 새로 삽입한다 (트랜잭션으로 처리) — "최신 파일로 교체" 결정을 그대로 반영.
- 원본 엑셀의 12개 월별 시트를 모두 파싱해 저장하지만, 화면에서는 기본적으로 데이터가 있는 가장 최근 월을 보여주고 드롭다운으로 다른 달도 조회 가능하게 한다.

### RLS 정책 (두 테이블 공통 패턴)
- SELECT: `tenant_id = my_tenant_id()` AND (`is_tenant_admin()` OR `profiles.team = '염전관리팀'`)
- INSERT: 위 조건과 동일하되 `uploaded_by = auth.uid()` 추가 — **팀장 제한 없이 팀원 전체 업로드 가능** (기존 생산의뢰서의 "팀장만" 패턴과 다른 점)
- DELETE/UPDATE: 별도 정책 없음 (이번 범위에서 수정 기능 제외 — 잘못 올리면 관리자가 Supabase에서 직접 처리)

### 원본 파일 저장 여부
production-requests와 달리 **원본 엑셀 파일은 Storage에 보관하지 않는다.** 파싱된 구조화 데이터(날짜별 생산량, 품목별 재고)가 곧 조회 대상이라 원본을 다시 열어볼 일이 없고, 감사 로그도 이번 범위에서 제외하기로 했기 때문 — Storage 버킷과 관련 RLS 정책을 안 만들어도 되어 구현이 단순해진다.

## 컴포넌트 구조
- `components/saltfield/ProductionUploadButton.tsx` — 엑셀 선택 → 업로드 서버 액션 호출 → 성공/실패 처리 (클라이언트)
- `components/saltfield/ProductionRecordList.tsx` — 요약 카드 + 날짜별 목록 표 (서버에서 데이터 받아 렌더링)
- `components/saltfield/ProductionRecordDetail.tsx` — 공구별(1/2/3공구) 호수별 생산량 표
- `components/saltfield/MaterialUploadButton.tsx` — 부자재재고 엑셀 업로드 버튼 (교체 확인 문구 포함)
- `components/saltfield/MaterialInventoryTable.tsx` — 검색 + 월 선택 드롭다운 + 표

## 서버 액션 / 파싱 로직
- `lib/saltfield/parse-production.ts` — `생산-염전` 탭에서 날짜별 행(B=일자, F=일일실적, G~AY=호수별 값, AZ~BN=주간/월간/연간 요약)을 읽어 실제 값이 있는 날짜만 추출. 열 매핑은 헤더 행(9~10행)의 "N공구"/"N-M호" 라벨을 코드로 읽어 자동 구성한다 (하드코딩 대신 헤더 파싱 — 향후 호수 구성이 바뀌어도 대응 가능)
- `lib/saltfield/parse-materials.ts` — 워크북의 모든 월별 시트를 순회하며 4행 헤더 기준으로 5행부터 품명이 있는 행만 파싱
- `app/actions/saltfield-production.ts` — `uploadProductionReport(formData)`, `getProductionRecords()`, `getProductionRecordDetail(date)` — 팀/관리자 권한은 서버 액션에서도 재확인 (`approvals.ts`의 `assertAdmin` 패턴처럼 `assertSaltfieldAccess`)
- `app/actions/saltfield-materials.ts` — `uploadMaterialInventory(formData)`, `getMaterialInventory(monthLabel?)`

## 외부 의존성
새 패키지 없음 — 이미 설치된 `exceljs`(생산의뢰서/생산일지 파싱에 사용 중)를 그대로 사용한다.

## 결정 근거
- **날짜별 upsert(생산량) vs 전체 교체(부자재재고)**: 아이디에이션 단계에서 확정한 방식 그대로. 생산량은 "이력이 쌓여야" 의미가 있고, 재고는 "지금 수량"만 중요하기 때문.
- **팀원 전체 업로드 허용**: 기존 생산의뢰서(영업채산팀장만 업로드)와 다르게, 염전관리팀은 현장 특성상 여러 담당자가 교대로 보고서를 작성하므로 팀장 제한을 두지 않기로 함 (아이디에이션 단계 확정 사항).
- **원본 파일 미보관**: 감사 로그를 범위에서 제외했고, 파싱된 데이터 자체가 조회 목적을 충분히 만족하므로 Storage 연동을 생략해 구현 복잡도를 낮췄다.
- **헤더 행을 파싱해 호수 목록을 동적으로 구성**: 엑셀 열 순서(G~AY)를 코드에 하드코딩하면 나중에 호수가 추가/삭제될 때마다 코드를 고쳐야 한다. 9~10행의 라벨을 읽어 매핑을 만들면 엑셀 구조 변경에 더 유연하게 대응한다.

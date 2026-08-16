# 생산팀 화면 개발 결정사항

## 라우트 구조

| 경로 | 상태 | 설명 |
|---|---|---|
| `/worklog` | 기존 그대로 재사용 | 코드 변경 없음. `profile.role`만 보고 팀원/팀장 화면을 렌더링하는 구조라 생산팀 계정만 만들면 그대로 동작함 |
| `/production-requests` | 접근권만 확장 | 기존 화면 그대로, 생산팀도 조회 가능하도록 nav-items의 표시 조건만 수정 (업로드/수정 권한은 영업채산팀장·admin 그대로 유지) |
| `/production-logs` (신규) | 신규 개발 | 생산일지 엑셀 업로드 + 공정별 탭 조회 화면 |

### `/worklog`가 코드 변경 없이 되는 이유
`app/(app)/worklog/page.tsx`는 `profile.team`을 보지 않고 `profile.role`(member/leader)만으로 화면을 고른다. `LeaderAggregateView`의 "상위 팀"도 `team_hierarchy`에서 해당 팀을 찾아 없으면 `reportsToTeam: null`로 처리한다 — 이는 영업팀(최상위)과 동일한 동작이라, 생산팀을 위한 `team_hierarchy` 행을 추가로 넣을 필요가 없다. 즉 생산팀 계정(`profile.team = '생산팀'`)만 만들어지면 업무일지 기능은 별도 개발 없이 그대로 동작한다.

## 데이터베이스 스키마

### `production_logs` (신규 테이블)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID NOT NULL | SaaS 대비 필수 |
| uploaded_by | UUID NOT NULL REFERENCES profiles(id) | |
| team | TEXT NOT NULL | 업로드 시점 업로더 소속팀 (생산팀 고정이지만 다른 팀 확장 대비 저장) |
| period_label | TEXT NOT NULL | 예: "2026년 1월" (파일명에서 추출 또는 업로드 시 직접 입력) |
| file_path | TEXT NOT NULL | Storage 내 원본 엑셀 경로 |
| file_name | TEXT NOT NULL | |
| sheets | JSONB NOT NULL | `[{ name: string, headers: string[], rows: Record<string,string>[] }]` — 탭별 헤더/데이터를 그대로 저장 |
| created_at | TIMESTAMPTZ | |

**RLS 정책**
- SELECT: 같은 tenant의 생산팀(팀원+팀장) 전체 + admin
- INSERT: 생산팀 소속이면 팀원/팀장 구분 없이 누구나 + admin (기획서에 명시된 대로 "누구나 업로드 가능")
- DELETE: 본인이 올린 것 또는 admin (실수로 잘못 올렸을 때 되돌릴 수 있어야 해서 기획서엔 없지만 추가 — 팀원 전체가 업로드 가능하니 삭제는 최소한 본인 것만이라도 가능해야 함)
- UPDATE: 정책 없음 — 이번 범위는 업로드된 내용을 그대로 보여주기만 하고 수정 기능은 없음

**Storage 버킷**: `production-logs` (private), 업로드는 본인 폴더(`{user_id}/...`)에만, 조회는 인증된 사용자 전체 — `production-requests` 버킷과 동일한 정책 재사용

## 컴포넌트 구조

- `lib/production-logs/parse.ts`: ExcelJS로 워크북의 모든 시트를 순회하며 "■ 생산일보" 고정 제목 아래 3번째 행을 헤더, 4번째 행부터 데이터로 동적 인식해 `{ name, headers, rows }[]`를 반환. 필드를 고정 타입으로 정의하지 않고 시트별로 있는 그대로 다뤄서, 탭 구성이나 컬럼이 달마다 조금 바뀌어도 코드 수정 없이 대응
- `lib/production-logs/efficiency.ts`: `computeProcessEfficiency(sheetsList: ProductionLogSheet[][])` 순수 함수. "총근무시간"·"실근무시간" 컬럼이 모두 있는 시트만 골라 공정별(또는 시트명 기준)로 근무시간/정지시간/투입량/투입인원을 합산한다. `"use server"` 파일이 아니라서 서버 액션과 클라이언트 컴포넌트 양쪽에서 그대로 import해 재사용한다.
- `app/actions/production-logs.ts`: `uploadProductionLog`, `getProductionLogList`, `getProductionLogDetail`, `deleteProductionLog`, `getProductionLogFileUrl`, `getProductionLogPeriods`, `getProductionEfficiency`, `getProductionTrend` — `production-requests.ts`와 동일한 패턴(파일 검증 → 파싱 → Storage 업로드 → DB insert)
- `components/production/ProductionLogView.tsx`: "생산효율"/"인당생산성" 2개 모드 토글. `usePeriodRangeData<T>(fetchRows)` 제네릭 훅으로 기간 선택 UI+재조회 로직을 공유. `EfficiencyView`(공정별 가동률 표), `TrendView`(기간별 흐름 리스트), `ProductionLogBrowser`(업로드/목록/파일별 요약 카드/원본 표 — "생산효율" 탭 하단에 통합, 별도 탭으로 분리하지 않음)
- `app/(app)/production-logs/page.tsx`: 생산팀(전체) + admin만 접근, 그 외는 홈으로 리다이렉트

## 시작/종료시간 처리
원본 엑셀의 시작/종료시간 컬럼이 Excel의 날짜 기준일(1899-12-30)로 잘못 해석되는 셀이 섞여 있음을 확인했다. `parse.ts`에서 셀 타입이 Date이고 값이 시간 전용(날짜부가 1899-12-30/31)인 경우 `HH:mm`로만 포맷하도록 `cellText` 로직에 예외 처리를 추가한다.

## 생산효율 / 인당생산성 탭 (가동률·흐름 집계)

- `getProductionEfficiency(startPeriod?, endPeriod?)`: 선택한 기간 범위의 `production_logs.sheets`를 모아 `computeProcessEfficiency()`로 공정별 가동률/정지시간을 집계한다.
- `getProductionTrend(startPeriod?, endPeriod?)`: 기간(월) 단위로 그룹핑한 뒤, 각 월의 시트들을 `computeProcessEfficiency()`로 집계하고 그 결과를 다시 공정 구분 없이 합산해 월 단위 요약 1건으로 만든다. 오래된 기간 → 최근 기간 순으로 정렬해 반환 — "인당생산성" 탭이 시계열(흐름)로 보여주는 근거 데이터.
- `getProductionLogPeriods()`: 실제 존재하는 `period_label` 목록을 오래된 순으로 반환 — 기간 선택 드롭다운을 채우는 용도.
- 기간 필터링은 `period_label`("YYYY년 M월", 항상 서버가 생성하는 고정 형식) 단위로 이뤄진다. `periodSortKey()`가 이 문자열을 `연*12+월` 정수로 변환해 범위/정렬 비교에 사용한다 — 작업일(행 단위 날짜)까지 파고들지 않고 업로드 단위(월)로 필터링하는 게 이번 범위.
- 그룹 키는 "공정명" 컬럼이 있으면 그 값, 없으면 시트 이름을 그대로 사용한다.
- 합산 컬럼: 총근무시간, 실근무시간, 정지시간, 준비, 휴게, 청소, 고장, 기타, 투입량, 투입인원 — 컬럼이 없으면 0으로 취급(문자→숫자 변환 실패 시에도 0).
- 가동률 = 실근무시간 합 ÷ 총근무시간 합 × 100 (총근무시간 합이 0이면 0%로 표시).
- 인당 투입량 = 투입량 합 ÷ 투입인원 합 (투입인원 합이 0이면 0으로 표시). "인당생산성"(주간_월간_업무보고.xlsx) 리포트의 "생산효율지표(정기근로생산량÷인원)" 개념을 참고한 근사 지표 — 원본은 완제품 생산량(kg)·정규 인원 기준이고 우리는 공정 단위 투입량/투입인원 기준이라 산출 기준이 다르다는 점을 화면에 명시한다.
- 화면 구성 (사용자 피드백 반영 후 최종):
  - **생산효율** 탭: 상단에 기간 범위 선택 + 공정별 가동률(막대바+%) 표(`EfficiencyView`). 그 아래에 생산일지 업로드/목록/원본 조회(`ProductionLogBrowser`)를 통합 — 파일을 선택하면 원본 표보다 먼저 그 파일만의 요약 카드(참여 공정 수/가동률/총 정지시간/인당 투입량, `computeProcessEfficiency([detail.sheets])`로 클라이언트에서 즉시 계산)를 보여준다.
  - **인당생산성** 탭: 공정별 스냅샷이 아니라 `getProductionTrend` 결과를 기간(월) 오래된 순으로 나열하는 리스트(`TrendView`). 각 행은 가동률/투입인원/투입량과 인당 투입량 막대바(그 기간 범위 내 최댓값 대비 상대 크기)를 보여줘 "흐름"을 스캔하듯 볼 수 있게 한다.
- 이 계산은 컬럼명을 정확히 일치시켜야 동작하므로, 원본 엑셀의 헤더 문구("총근무시간", "실근무시간", "투입량", "투입인원" 등)가 달라지면 집계에서 빠질 수 있다는 한계를 인지하고 진행한다(엄격 매칭이 "그럴듯하게 틀린 집계"보다 안전하다는 기존 판단 기준과 동일).

### "use server" 파일에서 타입만 재-export하면 안 되는 이유
`app/actions/production-logs.ts`에 `export type { ProcessEfficiency }`를 뒀더니 Turbopack의 서버 액션 변환기가 이를 런타임 값 참조로 오인해 `ReferenceError: ProcessEfficiency is not defined`가 발생했다. `"use server"` 파일은 async 함수만 런타임 export로 다뤄야 안전하다 — 타입이 필요한 곳(클라이언트 컴포넌트 등)은 실제 타입이 정의된 `lib/production-logs/efficiency.ts`에서 직접 import해야 한다.

## 접근 권한 (nav-items.ts)
현재 `canViewInventory`가 "재고현황"과 "생산의뢰서"를 함께 묶어 영업채산팀에만 열어주고 있어, 이걸 그대로 생산팀에 확장하면 재고현황까지 보이게 되는 문제가 있다. 그래서:
- `canViewInventory`(재고현황 전용으로 의미 축소): 기존 그대로 영업채산팀 + admin
- `canViewProductionRequests`(신규): 영업채산팀 + 생산팀 + admin — "생산의뢰서" nav item을 여기로 옮김
- `canViewProductionLogs`(신규): 생산팀 + admin — "생산일지" nav item

## 외부 의존성
없음 — 기존에 설치된 `exceljs`를 그대로 사용

## 결정 근거
- 업무일지를 팀 무관하게 설계해둔 FEAT-003 구조 덕분에 이번 기능의 절반(업무보고)은 신규 개발이 사실상 없다
- 생산일지 컬럼을 고정 타입으로 만들지 않고 동적으로 처리하기로 한 이유: 실제 파일 5개 탭이 컬럼 수(33~50개)와 구성이 전부 달라, 고정 스키마로 만들면 매달 엑셀 양식이 조금만 바뀌어도 코드를 고쳐야 함 — 헤더 행을 그대로 신뢰하는 방식이 훨씬 안전
- "생산의뢰서"를 "재고현황"에서 분리한 이유: 생산팀에게 재고현황까지 열어줄 필요는 없다고 명시적으로 확인했기 때문(이번 범위 제외)

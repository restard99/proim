# 원재료,반제품 현황(생산) 개발 결정사항

## 라우트 구조
- 페이지: `app/(app)/production-material-inventory/page.tsx` (서버 컴포넌트)
  - `production-logs`/`production-requests` 페이지와 동일한 패턴: 로그인 확인 → `profiles.team/role` 조회 → 권한 확인 → 클라이언트 컴포넌트 렌더
- 클라이언트 컴포넌트: `components/production/ProductionMaterialInventoryView.tsx`
  - `ProductionLogView`의 `ProductionLogBrowser`(좌측 업로드+목록 / 우측 상세) 레이아웃을 그대로 재사용하되, 생산효율·인당생산성 같은 부가 탭 없이 단일 화면
- 서버 액션: `app/actions/production-material-inventory.ts`
  - `uploadProductionMaterialInventory(formData)`, `getProductionMaterialInventoryList()`, `getProductionMaterialInventoryDetail(id)`, `getProductionMaterialInventoryFileUrl(path)`, `deleteProductionMaterialInventory(id)`
- 파싱 모듈: `lib/production-material-inventory/parse.ts`
  - `lib/yerp/production-materials.ts`(생산의뢰서의 Y-ERP 부자재 매칭)와 이름이 겹치지 않도록 별도 폴더로 분리

## 네비게이션
- `components/layout/nav-items.ts`에 `PRODUCTION_MATERIAL_INVENTORY_NAV_ITEMS` 배열 추가, `PRODUCTION_LOGS_NAV_ITEMS` 바로 다음에 push해서 "생산일지" 아래에 노출
- 권한 함수 `canViewProductionMaterialInventory(team, role)` 신설: `role === "admin" || team === "생산팀"` (생산일지와 동일 — 업로드도 생산팀 전체 가능, 생산의뢰서처럼 팀장 제한 없음)

## 데이터베이스 스키마
```sql
CREATE TABLE production_material_inventories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  uploaded_by    UUID NOT NULL REFERENCES profiles(id),
  team           TEXT NOT NULL,
  snapshot_date  DATE NOT NULL,   -- 엑셀 제목행의 기준일(예: 2026.09.01)에서 자동 추출
  file_path      TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  raw_materials  JSONB NOT NULL,  -- 원재료및부재료 섹션 {rows: [...], totals: null}
  semi_finished  JSONB NOT NULL,  -- 반제품 섹션 {rows: [...], totals: {...} | null}
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: 생산팀 전체(팀원+팀장) + 관리자 SELECT/INSERT, 삭제는 업로드한 본인 또는 관리자만
-- (production_logs와 동일한 정책 구조 재사용, UPDATE 정책 없음 — 수정 기능 없음)
CREATE INDEX ON production_material_inventories(tenant_id, snapshot_date DESC);
-- storage bucket: production-material-inventory (private, 본인 폴더에만 업로드/삭제, 인증된 사용자 조회)
```
※ `tenant_id` 포함 — SaaS 전환 대비 규칙 준수

## 파싱 규칙 (lib/production-material-inventory/parse.ts)
1. 시트에서 셀 텍스트가 정확히 `"원재료 및 부재료 재고 목록"` / `"반제품 재고 목록"`인 행을 각 섹션의 제목행으로 찾는다.
2. 제목행과 같은 행의 날짜 셀(`YYYY.MM.DD` 패턴)을 정규식으로 뽑아 그 섹션의 `snapshot_date`로 쓴다. (파일명이 아니라 시트 내용에서 추출 — 파일명은 "9월"처럼 월 단위라 부정확함)
3. 제목행 바로 다음 2행(병합 헤더)의 텍스트로 열 매핑을 만든다(TASK-001에서 도입한 라벨 기반 매핑 방식 재사용) — 향후 서식이 바뀌어도 라벨만 유지되면 안전하게 파싱된다.
4. 데이터 행은 SEQ 열이 비어 있고 나머지도 공백인 행(빈 행) 또는 다음 섹션 제목행을 만나면 종료.
5. 반제품 섹션 끝에 있는 "합계" 행(제품명 없이 SEQ열도 빈 값)은 별도로 `totals`로 파싱한다. 원재료 섹션에는 합계 행이 없으므로 `totals: null`.
6. 수식 셀(공유수식 포함)은 `cell.value`가 아니라 `cell.result`로 캐시된 계산값을 읽는다 — exceljs에서 공유수식 자식 셀은 `.value`에 결과가 안 실리고 `.result`에만 실리는 것을 실제 파일로 확인함. `#DIV/0!` 등 오류 결과는 `null`로 저장.
7. 결재란/원염재고 요약/선별전후 요약 등 부속 표는 파싱 대상에서 제외(스펙에 명시).

## 컴포넌트 구조
- `ProductionMaterialInventoryView` (client): 목록 상태, 선택된 업로드 id, 상세 데이터, 업로드/삭제 트랜지션 관리
- 좌측 패널: 업로드 input + 날짜별 이력 목록(최신순) — `ProductionLogBrowser`와 동일 UX
- 우측 패널: "원재료·부재료 / 반제품" 탭 버튼 2개 + 표 (반제품 탭은 하단에 합계 행 추가) + "원본 파일 열기"/"삭제" 버튼
- 빈 상태("업로드해주세요"), 로딩 상태, 업로드 오류 메시지는 02-design.html의 상태 3/4 그대로 구현

## 외부 의존성
- 없음 (기존 `exceljs` 재사용)

## 결정 근거
- **production_logs 패턴을 그대로 복제**: 업로드 권한(생산팀 전체), RLS 구조, 좌측 목록/우측 상세 UX가 이미 생산팀이 익숙하게 쓰고 있는 화면과 동일해 학습 비용이 없음
- **snapshot_date를 파일명이 아니라 시트 내용에서 추출**: 파일명은 "9월"처럼 월 단위로만 적혀 있어 하루 단위 정확한 이력 관리가 안 됨. 시트 제목행의 실제 날짜를 신뢰하는 편이 정확함
- **라벨 기반 열 매핑 재사용**: FIX-010 TASK-001에서 생산의뢰서 파싱이 열 위치 하드코딩 때문에 깨졌던 사례가 있어, 같은 실수를 반복하지 않기 위해 동일한 방어적 패턴을 새 파서에도 적용
- **수정 기능 없음**: 이 화면은 순수 조회용 스냅샷이라, 값이 틀리면 원본 엑셀을 고쳐 재업로드하는 것이 자연스러운 흐름(생산일지와 동일). 생산의뢰서처럼 개별 항목을 앱에서 고치는 기능은 이번 범위에서 제외

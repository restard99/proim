# TASK-008: 섬들채 실적(매출) 업로드 — 아티팩트

## 상태: 코드 작성 완료 (Supabase 적용 대기)

## 구현 내용
사용자 피드백으로 범위가 다시 조정됐다: "엑셀파일(주간업무보고 워크북)을 통해서는 매출계획만 가져오고, 실적(매출)은 섬들채 POS에서 별도로 내보낸 파일로 올린다." 실제 파일(`섬들채 상품별 매출 일자별 (상품별) (2).xls`, 19,269행)을 받아 확인했다.

- `xlsx`(SheetJS) 패키지를 추가했다 — 이 파일이 레거시 바이너리 `.xls`라 exceljs로는 못 읽는다. `xlsx`는 `.xls`/`.xlsx` 둘 다 읽는다.
- 파일의 "대분류" 열(온라인쇼핑몰/소금가게/아이스크림가게/힐링스파/소금박물관/천일염힐링캠프/함초식당)이 기존 표준 업장명과 이름이 달라, 사용자에게 직접 확인받아 매핑표를 만들었다.
- 원시 데이터를 그대로 저장하는 테이블을 새로 만들고(사용자가 "판매데이터 저장을 위해서 원시 판매데이터를 준거야"라고 명확히 함), 주간업무보고 6페이지는 이 원시 데이터에서 조회 시점에 주간/월누적으로 직접 집계하도록 바꿨다(목표처럼 스냅샷을 미리 계산해 저장하지 않음 — Y-ERP 기반 다른 페이지와 같은 방식).
- 이에 따라 TASK-002/003/005에서 만들었던 "목표 워크북에서 섬들채 실적도 같이 저장"하는 로직은 제거했다 — 계획과 실적을 서로 다른 담당자가 서로 다른 파일로 올리게 됐기 때문이다.

## 생성/수정된 파일
- `lib/supabase/schema.sql`: `executive_seomdeulchae_sales_raw` 테이블 + RLS 추가
- `C:\Users\resta\Downloads\executive-seomdeulchae-sales-raw-migration.sql`: 단독 마이그레이션 파일
- `lib/executive/parse-seomdeulchae-sales-raw.ts` (신규): xlsx(SheetJS) 기반 파서, 대분류→표준 업장명+법인코드 매핑
- `app/actions/executive-seomdeulchae-sales.ts` (신규): `uploadSeomdeulchaeSalesRaw`(500행씩 청크 upsert), `getSeomdeulchaeSalesRawSummary`
- `lib/executive/parse-report-workbook-targets.ts`: `SeomdeulchaeUnitRow`에서 `weekActual`/`monthActual` 제거(계획만)
- `app/actions/executive-targets.ts`: 섬들채 스냅샷 저장을 delete-then-insert → upsert(계획 컬럼만)로 변경 — 실적 업로드와 서로 덮어쓰지 않게
- `app/actions/executive-report.ts`: `loadSeomdeulchaeUnitReport`를 계획(스냅샷)+실적(원시 데이터 실시간 집계) 병합 방식으로 재작성
- `components/executive/SeomdeulchaeSalesUploadPanel.tsx`: "준비 중" 자리표시자 → 실제 업로드 UI + 현재 저장 현황 표시
- `app/(app)/executive/sales-upload/page.tsx`, `app/(app)/admin/executive-targets/page.tsx`, `components/admin/ExecutiveTargetUpload.tsx`: 요약 데이터 전달

## 완료 기준 확인
- [x] 원시 데이터 테이블 + upsert 방식 재업로드 지원
- [x] 대분류 매핑표 (함초식당→소금항카페 포함, 사용자 확인 완료)
- [x] 레거시 .xls 직접 파싱 확인
- [x] 업로드 권한(관리자 + 개인 부여)
- [x] 주간업무보고 6페이지 계획+실적 병합
- [x] 실제 원본 .xls 파일로 파싱 검증 (19,263행 정상 파싱, 업장별 합계 확인)
- [x] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과
- [ ] Supabase에 실제 적용 — **사용자가 SQL Editor에서 `executive-seomdeulchae-sales-raw-migration.sql` 실행 필요**

## 이슈 및 결정사항
- "전체"(합계)는 POS 대분류에 없는 값이라(실제 업장 6개만 있음) 6개 업장 실적을 직접 더해서 계산한다 — 화면의 개별 업장 행과 항상 정확히 맞음
- "월간실적"은 달력 월 전체가 아니라 "월초~조회하는 주의 마지막 날"까지의 누적(MTD)으로 계산한다 — 이 보고서의 다른 페이지들(Y-ERP 기반)과 같은 관례
- 업로드 이력을 별도 로그로 남기지 않고 "현재 저장 현황"(건수/날짜범위/마지막 업로드 시각)만 보여준다 — 같은 (날짜,업장,상품코드)를 upsert하는 구조라 "업로드 1회당 이력"을 정확히 추적하려면 별도 로그 테이블이 필요한데, 이번 범위에서는 과하다고 판단

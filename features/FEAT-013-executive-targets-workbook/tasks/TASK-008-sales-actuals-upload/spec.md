# TASK-008: 섬들채 실적(매출) 업로드

## 목적
섬들채 POS의 "일자별 (상품별)" 판매 데이터를 업로드하면 원본 그대로 저장하고, 주간업무보고 6페이지의 업장별 실적을 여기서 그때그때 집계해서 보여준다. 목표(계획)는 TASK-002~003(워크북 업로드)이 그대로 담당하고, 실적만 이 업로드로 분리한다.

## 작업 범위
- 생성할 파일: `lib/executive/parse-seomdeulchae-sales-raw.ts`, `app/actions/executive-seomdeulchae-sales.ts`
- 수정할 파일: `lib/supabase/schema.sql`, `components/executive/SeomdeulchaeSalesUploadPanel.tsx`, `app/(app)/executive/sales-upload/page.tsx`, `app/(app)/admin/executive-targets/page.tsx`, `components/admin/ExecutiveTargetUpload.tsx`
- 수정할 파일(범위 조정으로 인한 되돌림): `lib/executive/parse-report-workbook-targets.ts`, `app/actions/executive-targets.ts`, `app/actions/executive-report.ts` — 목표 워크북 업로드에서 섬들채 실적(week_actual/month_actual) 관련 로직 제거, 주간업무보고 6페이지가 실적을 이 새 테이블에서 직접 집계하도록 교체

## 완료 기준
- [ ] `executive_seomdeulchae_sales_raw` 테이블(원시 데이터, UNIQUE(tenant_id,sale_date,business_unit,product_code)로 재업로드 시 upsert)
- [ ] 대분류→표준 업장명 매핑(사용자 확인 완료: 온라인쇼핑몰→택배/쇼핑몰, 아이스크림가게→소금아이스크림, 힐링스파→해양힐링센터, 소금박물관→박물관, 천일염힐링캠프→카라반, 함초식당→소금항카페)
- [ ] 레거시 .xls 지원 (exceljs 대신 xlsx(SheetJS) 사용)
- [ ] 업로드 권한: 관리자 또는 "매출업로드" 메뉴를 개인 부여받은 사람
- [ ] 주간업무보고 6페이지: 계획은 스냅샷 테이블에서, 실적은 이 원시 데이터에서 주간/월누적으로 직접 집계해 합침
- [ ] 실제 파일로 검증 (원본 .xls 직접 파싱)
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과

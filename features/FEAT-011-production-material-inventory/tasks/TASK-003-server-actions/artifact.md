# TASK-003: 서버 액션 — 아티팩트

## 상태: 배포 완료

## 구현 내용
`production_logs`/`production_requests`의 서버 액션 패턴을 그대로 따라 업로드/목록/상세/파일URL/삭제 5개 액션을 작성했다. 업로드 시 파싱 결과에 기준일이 없거나 두 섹션 모두 항목이 0건이면 저장하지 않고 오류 메시지를 반환한다.

## 생성된 파일
- `app/actions/production-material-inventory.ts`

## 완료 기준 확인
- [x] `uploadProductionMaterialInventory`: 권한 확인 → 파싱 → storage 업로드 → DB insert, 실패 시 storage 롤백
- [x] `getProductionMaterialInventoryList`: snapshot_date desc 목록
- [x] `getProductionMaterialInventoryDetail`: 상세(두 섹션 포함)
- [x] `getProductionMaterialInventoryFileUrl`: signed URL
- [x] `deleteProductionMaterialInventory`: 업로드한 본인 또는 관리자만
- [x] `npx tsc --noEmit` 통과

## 이슈 및 결정사항
없음

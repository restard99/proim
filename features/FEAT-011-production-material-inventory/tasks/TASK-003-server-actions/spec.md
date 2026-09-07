# TASK-003: 서버 액션

## 목적
업로드/목록/상세/파일URL/삭제 서버 액션을 만든다.

## 작업 범위
- 생성할 파일: `app/actions/production-material-inventory.ts`

## 완료 기준
- [ ] `uploadProductionMaterialInventory(formData)`: 권한 확인(생산팀 전체+관리자) → 파싱 → storage 업로드 → DB insert, 실패 시 storage 롤백
- [ ] `getProductionMaterialInventoryList()`: snapshot_date desc 목록
- [ ] `getProductionMaterialInventoryDetail(id)`: 상세(두 섹션 데이터 포함)
- [ ] `getProductionMaterialInventoryFileUrl(path)`: signed URL
- [ ] `deleteProductionMaterialInventory(id)`: 업로드한 본인 또는 관리자만
- [ ] `npx tsc --noEmit` 통과

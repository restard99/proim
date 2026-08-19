# TASK-005: 부자재재고 파싱·업로드

## 목적
부자재 입출고내역 엑셀(월별 시트)을 파싱해서 재고현황을 저장하는 로직을 만든다.

## 작업 범위
- 생성할 파일:
  - `lib/saltfield/parse-materials.ts`: 모든 월별 시트를 순회하며 4행 헤더 기준 5행부터 품명 있는 행만 파싱(업체명/품명/단가/이월재고/입고/출고/재고/재고금액/비고)
  - `app/actions/saltfield-materials.ts`: `uploadMaterialInventory(formData)` — 기존 tenant 데이터 전체 삭제 후 새로 삽입(트랜잭션), `getMaterialInventory(monthLabel?)`
- 권한 체크: 염전관리팀 전체 + admin만 업로드 가능

## 완료 기준
- [ ] 실제 샘플 파일(`태평염전 2026년 부자재 입출고내역.xlsx`)을 업로드하면 12개 시트가 모두 파싱되어 저장됨
- [ ] 재업로드 시 기존 데이터가 완전히 교체됨(중복 안 남음)
- [ ] 품명이 비어있는 행은 건너뜀
- [ ] 염전관리팀이 아닌 계정은 업로드 액션 호출 시 거부됨
- [ ] `npx tsc --noEmit` 통과

# TASK-006: 부자재재고 화면

## 목적
부자재재고현황을 검색·조회할 수 있는 화면을 만든다.

## 작업 범위
- 생성할 파일:
  - `app/(app)/saltfield-inventory/page.tsx`
  - `components/saltfield/MaterialUploadButton.tsx`(교체 확인 문구 포함), `components/saltfield/MaterialInventoryTable.tsx`(검색 + 월 선택 + 표)
- `02-design.html`의 ⑤⑥⑦ 화면을 실제 컴포넌트로 구현

## 완료 기준
- [ ] `/saltfield-inventory` 접속 시 최신 월 재고현황 표가 보인다
- [ ] 업체명/품명으로 검색 가능
- [ ] 월 선택 드롭다운으로 다른 달 데이터도 조회 가능
- [ ] 업로드 시 "전체 교체" 안내 문구가 보이고, 성공/실패 결과가 표시됨
- [ ] 권한 없는 계정은 페이지 접근 시 홈으로 리다이렉트
- [ ] `npx tsc --noEmit` 통과

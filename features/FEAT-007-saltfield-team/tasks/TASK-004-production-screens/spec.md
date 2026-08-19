# TASK-004: 생산량 화면

## 목적
생산량 목록과 날짜별 상세를 볼 수 있는 화면을 만든다.

## 작업 범위
- 생성할 파일:
  - `app/(app)/saltfield-production/page.tsx`, `app/(app)/saltfield-production/[date]/page.tsx`
  - `components/saltfield/ProductionUploadButton.tsx`, `components/saltfield/ProductionRecordList.tsx`, `components/saltfield/ProductionRecordDetail.tsx`
- `02-design.html`의 ①②③④ 화면을 실제 컴포넌트로 구현 (요약 카드, 날짜별 목록 표, 공구별 상세 표, 빈 상태)

## 완료 기준
- [ ] `/saltfield-production` 접속 시 업로드 기록 목록과 요약 카드(오늘/주간/월간/연간)가 보인다
- [ ] 날짜 행 클릭 시 `/saltfield-production/[date]`로 이동해 공구별 호수별 생산량이 보인다
- [ ] 기록이 없을 때 빈 상태 화면이 보인다
- [ ] 권한 없는 계정은 페이지 접근 시 홈으로 리다이렉트
- [ ] `npx tsc --noEmit` 통과

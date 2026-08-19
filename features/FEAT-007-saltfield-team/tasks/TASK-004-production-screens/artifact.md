# TASK-004: 생산량 화면 — 아티팩트

## 상태: 완료

## 구현 내용
`/saltfield-production` 목록(요약 카드 + 날짜별 업로드 기록 + 빈 상태) 화면과 `/saltfield-production/[date]` 상세(공구별 호수별 생산량 표) 화면을 만들었다. 사이드바는 TASK-001에서 이미 연결된 `AppShell`/`getVisibleBusinessNavItems`를 그대로 사용하므로 별도 마크업 없이 자동으로 뜬다.

## 생성/수정된 파일
- `app/(app)/saltfield-production/page.tsx` (신규): 목록 페이지, 권한 체크 후 `ProductionRecordList`에 데이터 전달
- `app/(app)/saltfield-production/[date]/page.tsx` (신규): 상세 페이지, 없는 날짜는 `notFound()`
- `components/saltfield/ProductionUploadButton.tsx` (신규): 파일 선택 즉시 업로드, 실패 시 인라인 오류 메시지
- `components/saltfield/ProductionRecordList.tsx` (신규): 요약 카드 4개 + 날짜별 표 + 빈 상태
- `components/saltfield/ProductionRecordDetail.tsx` (신규): `field_data`를 라벨의 "N-" 접두사로 그룹핑해 공구별 표로 렌더링(하드코딩 없이 데이터 기반 그룹핑)

## 완료 기준 확인
- [x] `/saltfield-production` 접속 시 업로드 기록 목록과 요약 카드(오늘/주간/월간/연간)가 보이도록 구현
- [x] 날짜 행 클릭 시 `/saltfield-production/[date]`로 이동해 공구별 호수별 생산량이 보임
- [x] 기록이 없을 때 빈 상태 화면 표시
- [x] 권한 없는 계정은 페이지 접근 시 홈으로 리다이렉트 (`canViewSaltfield` 체크)
- [x] `npx tsc --noEmit` 통과, 개발 서버에서 두 라우트 모두 컴파일 에러 없이 307(미로그인 리다이렉트) 정상 응답 확인

## 이슈 및 결정사항
공구 그룹핑을 "1공구/2공구/3공구"로 하드코딩하지 않고, 저장된 `field_data`의 키(예: "1-1호")를 "-" 기준으로 나눠 앞자리로 동적 그룹핑했다 — TASK-003의 "하드코딩 대신 헤더 파싱" 결정과 같은 방향으로, 나중에 공구가 추가/변경돼도 화면 코드 수정이 필요 없다.

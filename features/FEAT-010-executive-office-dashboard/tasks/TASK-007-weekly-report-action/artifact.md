# TASK-007: 주간업무보고 서버 액션 — 아티팩트

## 상태: 완료

## 구현 내용
`getWeeklyReport(weekStartDate)`가 TASK-003(매출)/TASK-004(태평소금 생산)/`saltfield_production_records`(태평염전 생산)/`executive_targets`(목표)를 조합해 6개 페이지 데이터를 한 번에 반환한다. 목표가 없는 항목은 `null`로 내려가 화면에서 "미입력"으로 표시할 수 있다. 댓글 조회/작성 함수도 함께 만들었다.

## 생성/수정된 파일
- `app/actions/executive-report.ts` (신규): `getWeeklyReport`, `getComments`, `postComment`

## 완료 기준 확인
- [x] `team === "임원실"` 또는 admin이 아니면 `null`/빈 배열 반환 (조회 거부)
- [x] 목표 미업로드 시 계획 값 `null` 반환, 실적은 정상 계산 — `loadTargets`가 없는 조합은 Map에 안 담기므로 자동으로 null
- [x] 댓글은 `team==='임원실'`(또는 admin)만 작성, 조회는 임원실/전략기획실/admin
- [x] `npx tsc --noEmit` 통과
- [x] `executive_targets` 조회에 쓴 `.or()` 복합 필터(주간+월간 동시 조회)를 실제 Supabase에 테스트 데이터로 검증 — 의도한 2건만 정확히 매칭됨
- [x] 날짜 계산 함수(주 종료일/월 범위/전년동월 범위, 윤년 포함)를 단위 테스트로 검증

## 이슈 및 결정사항
- 태평염전 판매처를 도매/관내기타 등으로 나누지 않기로 한 TASK-003 결정에 따라, 2페이지(태평염전)·5페이지(태평소금)는 거래처별 목록 전체를 반환한다. 화면(TASK-008)에서 상위 N개 + 기타로 추려 보여줄 것.
- 섬들채(6페이지)의 "주간 계획"은 법인 전체 목표(`executive_targets`의 corp_code='0360' 주간 매출 목표)를 그대로 쓰고, 채널별 개별 목표는 두지 않았다(원본 목표 업로드 템플릿에도 채널별 목표 항목이 없음).

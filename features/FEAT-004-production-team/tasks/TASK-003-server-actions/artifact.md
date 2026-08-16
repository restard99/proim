# TASK-003: 생산일지 서버 액션 — 아티팩트

## 상태: 배포 완료

## 구현 내용
`production_requests.ts`와 동일한 업로드→파싱→Storage→DB insert 패턴으로 생산일지 서버 액션을 작성했다. 업로드는 생산팀 소속이면 팀원/팀장 구분 없이 가능하고(관리자도 가능), 삭제는 본인이 올린 것 또는 관리자만 가능하다. 파일명에서 "YYYY년 M월" 기간을 추출해 저장하고, 추출 실패 시 업로드 시점의 년/월로 대체한다.

## 생성/수정된 파일
- `app/actions/production-logs.ts`: `uploadProductionLog`, `getProductionLogList`, `getProductionLogDetail`, `getProductionLogFileUrl`, `deleteProductionLog`

## 완료 기준 확인
- [x] 업로드 권한: 생산팀 전체(팀원/팀장 무관) + admin
- [x] 파일명 기반 기간 추출 + 대체 로직
- [x] 목록/상세 조회
- [x] 원본 파일 서명 URL
- [x] 삭제: 본인 것 또는 admin
- [x] 파싱 실패/빈 데이터 시 안내 메시지 반환

## 이슈 및 결정사항
DB 마이그레이션(TASK-001)이 아직 Supabase에 적용되지 않은 상태라 런타임 동작은 다음 단계(화면 구현 후) 사용자 테스트 시점에 검증한다.

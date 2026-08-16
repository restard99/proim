# TASK-003: 생산일지 서버 액션

## 목적
생산일지 엑셀 업로드→파싱→Storage 저장→DB insert, 목록/상세 조회, 삭제, 원본 파일 URL 발급을 제공하는 서버 액션을 `production_requests.ts`와 동일한 패턴으로 작성한다.

## 작업 범위
- 생성할 파일: `app/actions/production-logs.ts`

## 완료 기준
- [ ] `uploadProductionLog(formData)`: 생산팀 소속(팀원/팀장 무관) 또는 admin만 업로드 가능, `.xlsx`만 허용, 15MB 제한
- [ ] 파일명에서 "YYYY년 M월" 형태의 기간을 추출해 `period_label`로 저장 (추출 실패 시 업로드 시점의 년/월로 대체)
- [ ] `getProductionLogList(limit)`: 생산팀+admin만 조회, 최신순
- [ ] `getProductionLogDetail(id)`: 시트 전체(`sheets`) 반환
- [ ] `getProductionLogFileUrl(path)`: 원본 파일 서명 URL
- [ ] `deleteProductionLog(id)`: 본인이 올린 것 또는 admin만
- [ ] 파싱 실패/시트 없음일 때 사용자에게 안내 메시지 반환 (throw하지 않음)

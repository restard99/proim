# TASK-003: 생산량 파싱·업로드

## 목적
주간업무보고 엑셀의 `생산-염전` 탭을 파싱해서 날짜별 생산량 레코드로 저장하는 로직을 만든다.

## 작업 범위
- 생성할 파일:
  - `lib/saltfield/parse-production.ts`: 9~10행 헤더에서 공구/호수 라벨을 읽어 열 매핑 구성 → 날짜별(B열)로 순회하며 실제 값 있는 행만 추출(F=일일실적, G~AY=호수별 값, AZ~BN=주간/월간/연간 요약)
  - `app/actions/saltfield-production.ts`: `uploadProductionReport(formData)` — 파일 파싱 → 날짜별 upsert(`tenant_id, record_date` 충돌 시 갱신), `getProductionRecords()`, `getProductionRecordDetail(date)`
- 권한 체크: 염전관리팀 전체 + admin만 업로드 가능하도록 서버 액션에서 재확인

## 완료 기준
- [ ] 실제 샘플 파일(`태평염전 염전관리팀 2026년 8월 1주차 주간업무보고(생산실적 포함).xlsx`)을 업로드하면 값이 채워진 날짜만 저장되고, 빈 미래 날짜는 저장 안 됨
- [ ] 같은 날짜를 포함한 파일을 다시 올리면 그 날짜 레코드가 갱신됨(중복 생성 안 됨)
- [ ] "생산-염전" 탭이 없는 파일을 올리면 명확한 오류 메시지 반환
- [ ] 염전관리팀이 아닌 계정은 업로드 액션 호출 시 거부됨
- [ ] `npx tsc --noEmit` 통과

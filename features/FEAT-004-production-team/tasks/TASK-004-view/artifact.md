# TASK-004: 생산일지 화면 — 아티팩트

## 상태: 배포 완료

## 구현 내용
02-design.html 목업대로 왼쪽 업로드+목록, 오른쪽 공정별 탭+범용 표를 보여주는 화면을 구현했다. 표는 컬럼을 하드코딩하지 않고 선택된 시트의 `headers`/`rows`를 그대로 렌더링한다. 삭제 버튼은 본인이 올린 항목이거나 admin일 때만 노출된다.

## 생성/수정된 파일
- `components/production/ProductionLogView.tsx`: 목록/상세 조회, 업로드, 탭 전환, 원본 파일 열기, 삭제
- `app/(app)/production-logs/page.tsx`: `canViewProductionLogs`(TASK-005)로 접근 제한, `currentUserId`/`isAdmin` 전달

## 완료 기준 확인
- [x] 왼쪽 업로드 + 기간 내림차순 목록
- [x] 오른쪽 탭 전환 + 범용 표
- [x] 원본 파일 열기
- [x] 삭제 버튼 조건부 노출
- [x] 빈 상태 문구
- [x] 업로드 실패 오류 메시지
- [x] 접근 제한 리다이렉트

## 이슈 및 결정사항
DB 마이그레이션(TASK-001)이 아직 Supabase에 적용되지 않아 실제 업로드/조회는 사용자가 마이그레이션 실행 후 테스트해야 한다.

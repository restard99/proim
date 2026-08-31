# TASK-006: 목표/확정손익 엑셀 업로드 (관리자) — 아티팩트

## 상태: 완료

## 구현 내용
`/admin/executive-targets`("매출 목표 관리") 페이지에 두 개의 업로드 섹션을 만들었다: (1) 매출/생산 목표, (2) 회계팀 확정 손익. 각각 전용 템플릿을 엑셀로 다운로드해 채운 뒤 업로드하면 행 단위로 검증 후 upsert되고, 업로드 이력이 표로 남는다.

## 생성/수정된 파일
- `lib/executive/parse-targets.ts` (신규): 목표 엑셀 파싱, 행 단위 오류 수집
- `lib/executive/parse-pl-confirmed.ts` (신규): 확정 손익 엑셀 파싱
- `app/actions/executive-targets.ts` (신규): `uploadTargets`, `getTargetUploadHistory`
- `app/actions/executive-pl-confirmed.ts` (신규): `uploadPlConfirmed`, `getPlConfirmedUploadHistory`
- `app/(app)/admin/executive-targets/page.tsx` (신규)
- `components/admin/ExecutiveTargetUpload.tsx` (신규): 업로드 섹션 2개 공용 컴포넌트
- `scripts/generate-executive-templates.mjs` (신규, 1회성): 템플릿 생성 스크립트
- `public/templates/executive-targets-template.xlsx`, `executive-pl-confirmed-template.xlsx` (신규)
- `proxy.ts`: matcher에서 `templates/` 경로 제외 (버그 수정, 아래 이슈 참고)
- `components/layout/nav-items.ts`: "임원실 목표 관리" → "매출 목표 관리" (사용자 요청으로 레이블 변경)

## 완료 기준 확인
- [x] admin 권한 없는 계정은 두 업로드 액션 호출 시 모두 거부됨 (`self.role !== "admin"` 체크)
- [x] 정상 템플릿 업로드 시 각 테이블에 upsert — 실제 Supabase에 upsert 테스트 완료 (service role로 두 테이블 모두 upsert 성공 후 정리)
- [x] 잘못된 형식 업로드 시 행 단위 오류 메시지 반환 (구분/기간유형/기간/숫자/법인명 각각 검증)
- [x] 업로드 이력 테이블에 최근 업로드 표시 — 목표/확정손익 각각
- [x] `npx tsc --noEmit` 통과

## 이슈 및 결정사항
템플릿 다운로드 링크(`/templates/*.xlsx`)가 계속 `/login`으로 리다이렉트되는 문제를 발견했다. 원인은 `proxy.ts`의 matcher 정규식이 `svg/png/jpg/jpeg/gif/webp` 확장자만 인증 제외 대상으로 넣어뒀고, `.xlsx`(와 사실 `.txt` 등 다른 확장자도)는 제외 목록에 없어 미로그인 상태에서 정적 파일 요청까지 `/login`으로 튕기고 있었다. `templates/` 경로 자체를 matcher 제외 목록에 추가해 해결했다. (템플릿 파일 자체는 빈 양식 + 예시 숫자만 있어 인증 없이 노출돼도 민감정보 없음.)

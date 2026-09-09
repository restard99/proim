# FIX-016 테스트 케이스

## 테스트 전 준비사항
- Supabase SQL Editor에서 `executive-targets-fix-null-duplicates-migration.sql` 실행

## 정상 케이스

### TC-001: 중복 행 정리 확인
**단계:**
1. 마이그레이션 실행 후 `executive_targets`에서 태평소금(0460) 특정 주(예: 2026-09-07)의 행 개수를 확인한다
**기대 결과:** period_type/period_key/corp_code 조합당 1행만 남는다
**결과:** [ ] 통과 / [ ] 실패

### TC-002: 재업로드 시 갱신 확인
**단계:**
1. 매출목표관리에서 같은 워크북을 다시 업로드한다
2. `executive_targets`에서 방금 확인한 조합의 행 개수를 다시 확인한다
**기대 결과:** 행 개수가 늘지 않고 값만 갱신된다(여전히 1행)
**결과:** [ ] 통과 / [ ] 실패

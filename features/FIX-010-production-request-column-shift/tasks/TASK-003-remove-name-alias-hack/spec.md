# TASK-003: 부자재 매칭 - 낡은 "천일염" 별칭 치환 규칙 제거

## 목적
사용자가 생산의뢰서 제품명을 Y-ERP 정식 품목명과 정확히 일치하도록 정리했는데도 부자재 매칭이 안 되는 문제. 원인은 `lib/yerp/production-materials.ts`의 `NAME_ALIAS_RULES`("천일염"을 무조건 " 한여름눈꽃천일염굵은소금 "으로 치환)가 예전 축약형 제품명 시절의 임시방편이었는데, 지금은 이미 정확히 일치하는 이름까지 망가뜨리고 있다.

## 작업 범위
- 수정할 파일: `lib/yerp/production-materials.ts`
  - `NAME_ALIAS_RULES`/`applyNameAliases` 제거
  - `getMaterialStatusForItems`에서 토큰화 시 원본 제품명을 그대로 사용

## 완료 기준
- [ ] 실제 `★생산의뢰서(0902).xlsx`의 69개 제품명으로 검증했을 때, 별칭 규칙 적용 시(11/69) 대비 제거 후(31/69) 매칭 개수가 늘어남 (회귀 없이 순증가)
- [ ] `npx tsc --noEmit`, `npm run build` 통과

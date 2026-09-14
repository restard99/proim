# FEAT-014 개발 결정사항

## 컴포넌트 구조
- `lib/yerp/customer-sort.ts`: 기존 `PRIORITY_GROUPS`(정렬 우선순위, `string[][]`)를 `CustomerGroupDef[]`(label/aliases/excludeKeywords)로 확장. 정렬용 `sortByPriorityCustomer`는 시그니처 그대로 유지. 새로 `getCustomerGroupLabel()`, `groupCustomerSales()`를 추가해 매출조회 화면에서 재사용.
- `components/sales/SalesByCustomerView.tsx`: `groupCustomerSales()`로 화면 표시 직전에 그룹핑(서버 액션/쿼리는 안 건드림), 그룹 행 클릭 시 펼침 상태를 로컬 state(`Set<string>`)로 관리.

## 왜 서버 쿼리(`getSalesByCustomer`)를 안 바꿨는가
`getSalesByCustomer`는 `app/actions/sales-targets.ts`(연간 목표 대비 진행률)에서도 원본 거래처 코드 단위로 그대로 쓰이고 있어, 반환 형태를 바꾸면 그쪽이 깨진다. 그룹핑은 화면 표시 전용 순수 함수로 분리해 원본 쿼리/다른 사용처에 영향이 없게 했다.

## 외부 의존성
없음(기존 코드 재사용).

## 결정 근거
- 그룹 정의(별칭/제외 키워드)를 실제 Y-ERP 거래처명 전수 조회로 검증한 뒤 확정(features/FEAT-014.../01-spec.md 참고).
- 정렬 우선순위와 그룹핑이 같은 정의를 공유하도록 한 곳(`customer-sort.ts`)에 모아, 나중에 그룹을 추가/수정할 때 한 군데만 고치면 되게 했다.

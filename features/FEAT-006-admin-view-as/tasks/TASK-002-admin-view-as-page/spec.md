# TASK-002: 담당자 선택 페이지

## 목적
관리자가 부서 탭에서 담당자를 골라 그 계정으로 전환을 시작할 수 있는 `/admin/view-as` 페이지를 만든다.

## 작업 범위
- 생성할 파일:
  - `app/admin/view-as/page.tsx`
  - `components/admin/AdminViewAsPicker.tsx`
- 수정할 파일: 없음 (TASK-001의 `startViewAs`, 기존 `listAllUsers`를 사용)

## 구현 세부
- `page.tsx`(서버 컴포넌트): 로그인 확인 + admin 여부 확인(아니면 `/`로 리다이렉트), `listAllUsers()` 호출 후 `role !== 'admin' && status === 'approved'`인 사용자만 `AdminViewAsPicker`에 전달
- `AdminViewAsPicker.tsx`(클라이언트 컴포넌트): 사용자 목록에서 팀(부서) 종류를 뽑아 탭으로 표시, 선택된 탭의 담당자를 카드 그리드로 표시. 담당자가 없는 탭은 빈 상태 문구 표시. 카드 클릭 시 `startViewAs(profileId)` 호출(전환 중 로딩 표시), 실패 시 오류 메시지 표시
- 디자인은 `02-design.html`의 ①/①-1/①-2/③ 화면을 그대로 따른다

## 완료 기준
- [ ] admin이 아닌 계정으로 `/admin/view-as` 접속 시 리다이렉트된다
- [ ] 부서 탭을 클릭하면 해당 부서 담당자만 보인다
- [ ] 담당자가 없는 부서는 빈 상태 문구가 보인다
- [ ] 담당자 카드를 클릭하면 전환이 시작되고 성공 시 홈 화면으로 이동한다
- [ ] 전환 실패 시 오류 메시지가 표시된다

# TASK-005: 승인대기 화면 & 접근 가드 — 아티팩트

## 상태: 배포 완료

## 구현 내용
가입 직후 승인 대기 상태를 보여주는 `/pending` 페이지와, 세션·승인상태·역할에 따라 전체 라우트 접근을 제어하는 `proxy.ts`를 구현했다.

## 생성/수정된 파일
- `proxy.ts` (신규): Next.js 16 컨벤션(구 middleware.ts)에 맞춘 접근 가드. `getUser()`로 세션 확인 → 미승인 시 `/pending`으로, 이미 승인된 사용자가 `/login`·`/signup` 접근 시 `/`로, `/admin/**`은 `role=admin`이 아니면 `/`로 리다이렉트
- `app/pending/page.tsx` (신규): 본인 프로필(이름/소속팀/직급/상태) 요약 카드 + 로그인 화면으로 이동 링크

## 완료 기준 확인
- [x] `/pending`은 로그인된 사용자의 이름/소속팀/직급/상태를 보여줌
- [x] 세션이 없는 사용자가 보호된 라우트에 접근하면 `/login`으로 리다이렉트
- [x] `status='pending'`인 사용자가 `/login`,`/signup`,`/pending` 외 경로 접근 시 `/pending`으로 리다이렉트
- [x] `/admin/**`은 `role='admin'`이 아니면 접근 불가

## 이슈 및 결정사항
- `npm run build` 과정에서 "middleware 파일 컨벤션은 deprecated, proxy를 쓰라"는 경고를 발견했다. 프로젝트가 Next.js 16.2.12라 실제로 `middleware.ts`는 구버전 컨벤션이었고, `proxy.ts`(함수명도 `proxy`)로 리네임해서 경고를 제거했다. 이에 맞춰 03-decisions.md, TASK-005 spec.md의 파일명 표기도 갱신했다.
- `tsc --noEmit`, `npm run lint`, `npm run build` 모두 통과 (경고 없음). 실제 리다이렉트 동작은 Supabase 프로젝트 연결 후 TASK-006 완료 시점에 종합적으로 수동 테스트한다.

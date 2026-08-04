# TASK-002: Y-ERP 연결 모듈

## 목적
Y-ERP(SMARTE_DB)에 서버 사이드에서만 읽기 전용으로 접속하는 공통 모듈을 만든다.

## 작업 범위
- 생성할 파일: `lib/yerp/client.ts`
- 수정할 파일: `package.json`(`mssql` 의존성 추가), `.env.local.example`(Y-ERP 접속용 변수 안내 추가)

## 완료 기준
- [ ] `npm install mssql` 완료
- [ ] `lib/yerp/client.ts`가 `MSSQL_HOST`, `MSSQL_PORT`, `MSSQL_DATABASE`, `MSSQL_USER`, `MSSQL_PASSWORD` 환경변수로 커넥션 풀을 생성하고 재사용(싱글턴)한다
- [ ] 이 모듈은 서버 전용으로만 import 가능해야 한다 (클라이언트 번들에 섞이지 않도록 조치)
- [ ] 접속 정보(호스트, 계정, 비밀번호)가 코드에 하드코딩되어 있지 않고 전부 환경변수로만 참조됨
- [ ] `.env.local`에 실제 값 채운 뒤 간단한 `SELECT 1` 쿼리로 연결 확인 (로컬 스크립트 또는 임시 서버 액션으로 검증 후 제거)
- [ ] `.env.local.example`에 Y-ERP 관련 변수명이 값 없이(플레이스홀더로만) 추가됨

# TASK-002: Y-ERP 연결 모듈 — 아티팩트

## 상태: 배포 완료

## 구현 내용
Y-ERP(SMARTE_DB)에 서버 사이드에서만 읽기 전용으로 접속하는 커넥션 풀 모듈을 만들었다. `server-only` 패키지로 클라이언트 번들에 섞이지 않도록 막았다.

## 생성/수정된 파일
- `lib/yerp/client.ts`: 커넥션 풀 싱글턴(`getYerpPool`) + 파라미터 바인딩 쿼리 헬퍼(`yerpQuery`)
- `package.json`: `mssql`, `server-only`(런타임), `@types/mssql`(dev) 의존성 추가
- `.env.local.example`: `MSSQL_HOST`/`MSSQL_PORT`/`MSSQL_DATABASE`/`MSSQL_USER`/`MSSQL_PASSWORD` 플레이스홀더 추가

## 완료 기준 확인
- [x] `npm install mssql` 완료 (+ 타입 검사를 위해 `@types/mssql` devDependency 추가)
- [x] 환경변수(`MSSQL_HOST` 등)로 커넥션 풀 생성, 재연결 없이 재사용
- [x] `server-only` import로 서버 전용 강제
- [x] 접속 정보는 전부 `process.env`로만 참조, 코드에 하드코딩 없음
- [x] 동일한 접속 설정(호스트/포트/DB/계정)으로 `SELECT 1` 스모크 테스트 성공 확인 — 실제 `.env.local`은 이 저장소에 없어 별도 임시 스크립트로 검증했고, `client.ts` 자체는 `npm run build`로 정적 검증만 했다
- [x] `.env.local.example`에 플레이스홀더 추가 (실제 값 없음)

## 이슈 및 결정사항
- 이 개발 환경에는 `.env.local`이 없어 `client.ts`를 Next.js 런타임에서 직접 기동해 검증하지는 못했다. 접속 파라미터 형식(호스트/포트/DB/계정/옵션)은 1단계에서 확인한 값 그대로 별도 스크립트로 연결 테스트를 통과했으므로, 실제 배포 시 동일한 값을 `.env.local`(로컬)과 Vercel 환경변수(배포)에 넣으면 그대로 동작할 것으로 예상한다.
- 사용자가 로컬에서 개발을 이어가려면 `.env.local`에 Y-ERP 접속 정보를 직접 채워 넣어야 한다.

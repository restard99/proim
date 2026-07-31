# 삼선 ERP — 개발 가이드

비개발자도 AI와 함께 일관성 있게 개발할 수 있는 하네스가 구성되어 있습니다.

## 빠른 시작

| 상황 | 커맨드 |
|------|--------|
| 새 기능을 개발하고 싶다 | `/new-feature` |
| 버그나 소소한 수정이 있다 | `/fix` |
| 현재 개발 현황이 궁금하다 | `/status` |

## 개발 주기 문서

- [8단계 개발주기 전체 설명](docs/harness/cycle.md)
- [/new-feature 사용법](docs/harness/new-feature.md)
- [/fix 사용법](docs/harness/fix.md)
- [/status 사용법](docs/harness/status.md)

## 핵심 규칙

1. 모든 기능 개발은 반드시 `/new-feature` 커맨드로 시작
2. 버그·소소한 수정은 `/fix` 커맨드로 시작
3. 브랜치는 커맨드가 자동 생성 — 직접 만들지 말 것
4. 모든 기능 산출물은 `features/` 폴더에 자동 저장
5. 모든 DB 테이블은 `tenant_id` 컬럼 필수 포함 (SaaS 전환 대비)

## 기술 스택

- **프레임워크:** Next.js 15 (App Router, TypeScript)
- **스타일링:** Tailwind CSS
- **데이터베이스:** Supabase (PostgreSQL + RLS)
- **배포:** Vercel (main 브랜치 → 프로덕션 자동 배포)

## 브랜치 전략

```
main        ← 프로덕션 (Vercel 자동 배포)
  └── dev   ← 통합 브랜치 (기능 완료 후 머지)
        ├── feat/001-기능명
        └── fix/001-수정내용
```

## 설계 문서

- [하네스 설계 스펙](docs/superpowers/specs/2026-07-31-harness-engineering-design.md)

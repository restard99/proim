# 하네스 엔지니어링 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 비개발자 바이브 코더가 `/new-feature`, `/fix`, `/status` 3개 커맨드만으로 삼선 ERP를 일관성 있게 개발·유지보수할 수 있는 하네스를 구축한다.

**Architecture:** Git 레포 내 `features/FEAT-NNN-기능명/` 폴더 기반 산출물 관리 + `.claude/commands/` 기반 커스텀 커맨드 3개로 8단계 개발주기를 자동화한다. 모든 기획·설계·개발·테스트 산출물은 Git으로 버전 관리된다.

**Tech Stack:** Next.js 14 (App Router, TypeScript, Tailwind CSS) + Supabase (PostgreSQL, RLS, Auth) + Vercel (자동 배포)

---

## 파일 구조

```
proim/
├── CLAUDE.md                          # Task 5
├── .gitignore                         # Task 1
├── .env.local.example                 # Task 1
├── package.json                       # Task 2 (Next.js)
├── app/
│   ├── layout.tsx                     # Task 2
│   └── page.tsx                       # Task 2
├── lib/
│   └── supabase/
│       ├── client.ts                  # Task 4
│       ├── server.ts                  # Task 4
│       └── schema.sql                 # Task 4
├── .claude/
│   └── commands/
│       ├── new-feature.md             # Task 6
│       ├── fix.md                     # Task 7
│       └── status.md                  # Task 8
├── features/                          # Task 3 (빈 폴더, 사용 준비)
└── docs/
    ├── harness/
    │   ├── cycle.md                   # Task 5
    │   ├── new-feature.md             # Task 5
    │   ├── fix.md                     # Task 5
    │   └── status.md                  # Task 5
    └── superpowers/
        ├── specs/
        │   └── 2026-07-31-harness-engineering-design.md  # 기존
        └── plans/
            └── 2026-07-31-harness-engineering.md         # 이 파일
```

---

## Task 1: Git 레포 초기화

**Files:**
- Create: `.gitignore`
- Create: `.env.local.example`

- [ ] **Step 1: Git 초기화 및 main 브랜치 설정**

```bash
cd C:\dev\proim
git init
git branch -M main
```

Expected: `Initialized empty Git repository in C:/dev/proim/.git/`

- [ ] **Step 2: .gitignore 생성**

Create `.gitignore`:
```
node_modules/
.next/
.env.local
.env
.vercel/
```

- [ ] **Step 3: .env.local.example 생성**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- [ ] **Step 4: 첫 커밋**

```bash
git add .gitignore .env.local.example docs/
git commit -m "chore: initialize repository with harness design docs"
```

Expected: `[main (root-commit) xxxxxxx] chore: initialize repository with harness design docs`

---

## Task 2: Next.js 프로젝트 생성

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Next.js 앱 생성**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --no-import-alias --yes
```

If prompted about Turbopack: No

- [ ] **Step 2: 개발 서버 실행 확인**

```bash
npm run dev
```

Expected: `▲ Next.js 14.x.x` + `Local:        http://localhost:3000` 출력
브라우저에서 `http://localhost:3000` 접속해 Next.js 기본 페이지 확인 후 서버 종료 (Ctrl+C)

- [ ] **Step 3: Supabase SSR 패키지 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Expected: 패키지 추가 완료, `package.json`에 두 패키지 등재

- [ ] **Step 4: 커밋**

```bash
git add .
git commit -m "chore: scaffold Next.js 14 with TypeScript, Tailwind, App Router"
```

---

## Task 3: 프로젝트 폴더 구조 생성

**Files:**
- Create: `features/.gitkeep`
- Create: `.claude/commands/.gitkeep`

- [ ] **Step 1: 필수 폴더 생성**

PowerShell:
```powershell
New-Item -ItemType Directory -Force -Path features
New-Item -ItemType Directory -Force -Path .claude\commands
```

- [ ] **Step 2: .gitkeep으로 빈 폴더 Git 추적**

PowerShell:
```powershell
New-Item -ItemType File -Path features\.gitkeep
New-Item -ItemType File -Path .claude\commands\.gitkeep
```

- [ ] **Step 3: dev 브랜치 생성**

```bash
git add features/ .claude/
git commit -m "chore: create harness folder structure"
git checkout -b dev
git push -u origin main 2>/dev/null || echo "Remote not set yet, skipping push"
```

Expected: `Switched to a new branch 'dev'`

---

## Task 4: Supabase 클라이언트 및 초기 스키마 설정

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/schema.sql`

- [ ] **Step 1: lib/supabase 폴더 생성**

PowerShell:
```powershell
New-Item -ItemType Directory -Force -Path lib\supabase
```

- [ ] **Step 2: 클라이언트사이드 Supabase 클라이언트 생성**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: 서버사이드 Supabase 클라이언트 생성**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: 초기 스키마 SQL 작성**

Create `lib/supabase/schema.sql`:
```sql
-- SaaS 전환 대비: 모든 테이블에 tenant_id 필수 적용

-- 테넌트 테이블 (회사 단위)
CREATE TABLE tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 프로필 (auth.users 확장)
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id),
  full_name  TEXT,
  role       TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security 활성화
ALTER TABLE tenants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 테넌트 데이터만 접근 가능
CREATE POLICY "profiles_tenant_isolation" ON profiles
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );
```

- [ ] **Step 5: TypeScript 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음 (경고는 무시)

- [ ] **Step 6: 커밋**

```bash
git add lib/
git commit -m "feat: add Supabase client setup and tenant-aware initial schema"
```

---

## Task 5: CLAUDE.md 및 하네스 문서 작성

**Files:**
- Create: `CLAUDE.md`
- Create: `docs/harness/cycle.md`
- Create: `docs/harness/new-feature.md`
- Create: `docs/harness/fix.md`
- Create: `docs/harness/status.md`

- [ ] **Step 1: CLAUDE.md 작성**

Create `CLAUDE.md`:
```markdown
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

- **프레임워크:** Next.js 14 (App Router, TypeScript)
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
```

- [ ] **Step 2: docs/harness/cycle.md 작성**

Create `docs/harness/cycle.md`:
```markdown
# 8단계 개발 주기

`/new-feature` 커맨드가 이 8단계를 순서대로 안내합니다.

| 단계 | 명칭 | 산출물 |
|------|------|--------|
| 1 | 아이디에이션 | `01-spec.md` |
| 2 | 디자인 | `02-design.html` |
| 3 | 개발 결정사항 | `03-decisions.md` |
| 4 | 태스크 분리 | `tasks/TASK-NNN/spec.md` |
| 5 | 태스크별 개발 | `tasks/TASK-NNN/artifact.md` |
| 6 | 테스트 케이스 생성 | `06-test-cases.md` |
| 7 | 피드백 반영 | 해당 단계 문서 업데이트 |
| 8 | 배포 | Vercel 프로덕션 반영 |

### 1단계: 아이디에이션
AI가 질문을 통해 기획을 구체화합니다. 기술적으로 불가능하거나 모호한 부분은 이 단계에서 제거합니다.
완료 기준: 무엇을 만들고 왜 만드는지가 명확히 정의된 상태

### 2단계: 디자인
1단계 기획 기반으로 AI가 HTML 목업을 생성합니다. 이 파일이 UI의 SSOT입니다.
완료 기준: 모든 화면이 HTML로 시각적으로 확인된 상태

### 3단계: 개발 결정사항
API 구조, DB 스키마, 컴포넌트 설계를 결정하고 문서화합니다.
완료 기준: 개발 전 모든 기술 선택이 문서화된 상태

### 4단계: 태스크 분리
개발을 독립 완료 가능한 단위(태스크)로 분리합니다. 각 태스크는 2시간 내 완료 가능한 크기입니다.
완료 기준: 모든 태스크의 spec.md가 생성된 상태

### 5단계: 태스크별 개발
태스크를 하나씩 실제 코드로 구현하고 artifact.md에 결과를 기록합니다.
완료 기준: 모든 태스크 코드 완성 + artifact 기록 완료

### 6단계: 테스트 케이스 생성 및 테스트
AI가 사용자가 따라할 수 있는 수동 테스트 케이스를 작성합니다. 직접 테스트를 수행합니다.
완료 기준: 모든 테스트 케이스 통과

### 7단계: 피드백 반영
테스트에서 발견된 문제를 수정합니다. 필요 시 2-6단계 중 해당 단계로 복귀합니다.
완료 기준: 모든 피드백 반영 완료

### 8단계: 배포
dev → main 머지, Vercel 프로덕션 자동 배포.
완료 기준: 프로덕션 URL에서 기능 정상 동작 확인
```

- [ ] **Step 3: docs/harness/new-feature.md 작성**

Create `docs/harness/new-feature.md`:
```markdown
# /new-feature 사용법

## 언제 사용하나요?
새로운 기능을 처음부터 개발할 때 사용합니다.

## 사용 방법
Claude Code 프롬프트에 `/new-feature`를 입력합니다.

## 진행 과정
1. AI가 "어떤 기능을 개발할까요?"라고 물어봅니다
2. 기능을 설명하면 FEAT 번호가 자동 채번됩니다 (예: FEAT-001)
3. `feat/001-기능명` 브랜치가 자동 생성됩니다
4. 8단계를 순서대로 진행하며, 각 단계 완료 후 "계속할까요?" 확인을 받습니다
5. 배포까지 완료되면 세션이 종료됩니다

## 세션이 중간에 끊겼다면?
`/status`로 현재 단계를 확인한 후, AI에게 "FEAT-001의 N단계부터 이어서 진행해줘"라고 말하면 됩니다.

## 주의사항
- 브랜치를 직접 만들지 마세요. 커맨드가 자동으로 만듭니다
- 디자인 변경이 있는 수정은 /fix가 아닌 /new-feature를 사용하세요
```

- [ ] **Step 4: docs/harness/fix.md 작성**

Create `docs/harness/fix.md`:
```markdown
# /fix 사용법

## 언제 사용하나요?
- 버그를 수정할 때
- UI 텍스트, 스타일 등 소소한 변경이 필요할 때
- 기존 기능의 동작을 약간 수정할 때
- **디자인 변경이 없는 경우에만** (디자인 변경이 있다면 /new-feature 사용)

## 사용 방법
Claude Code 프롬프트에 `/fix`를 입력합니다.

## 진행 과정
1. AI가 "어떤 문제인가요?"라고 물어봅니다
2. FIX 번호가 자동 채번됩니다 (예: FIX-001)
3. `fix/001-설명` 브랜치가 자동 생성됩니다
4. 6단계(문제정의 → 결정사항 → 태스크분리 → 개발 → 테스트 → 배포)를 진행합니다
```

- [ ] **Step 5: docs/harness/status.md 작성**

Create `docs/harness/status.md`:
```markdown
# /status 사용법

## 언제 사용하나요?
- 현재 어떤 기능이 개발 중인지 확인할 때
- 팀원이 어디까지 진행했는지 파악할 때
- 이전 세션에서 어디까지 했는지 기억이 안 날 때

## 사용 방법
Claude Code 프롬프트에 `/status`를 입력합니다.

## 출력 예시
```
┌─────────────────────┬──────────────┬──────────────────┐
│ 기능                │ 현재 단계     │ 마지막 업데이트   │
├─────────────────────┼──────────────┼──────────────────┤
│ FEAT-001 로그인     │ 5/8 개발중   │ 2026-07-30       │
│ FEAT-002 대시보드   │ 2/8 디자인   │ 2026-07-29       │
│ FIX-001 버튼오류    │ 완료         │ 2026-07-28       │
└─────────────────────┴──────────────┴──────────────────┘
```
```

- [ ] **Step 6: 커밋**

```bash
git add CLAUDE.md docs/harness/
git commit -m "docs: add CLAUDE.md and harness documentation"
```

---

## Task 6: /new-feature 커맨드 작성

**Files:**
- Create: `.claude/commands/new-feature.md`

- [ ] **Step 1: new-feature.md 커맨드 파일 작성**

Create `.claude/commands/new-feature.md`:
```markdown
# New Feature — 8단계 개발 주기 오케스트레이터

비개발자가 새 기능을 처음부터 배포까지 일관성 있게 개발할 수 있도록 8단계를 순서대로 안내합니다.

## 시작 절차

1. `features/` 폴더를 스캔해 기존 FEAT 번호 중 최대값을 찾는다
2. 다음 번호를 채번한다 (없으면 001부터 시작, 3자리 패딩)
3. 사용자에게 "어떤 기능을 개발할까요? 간단히 설명해주세요"라고 묻는다
4. 기능명을 영문 소문자 + 하이픈으로 변환한다 (예: "사용자 로그인" → "user-login")
5. `features/FEAT-NNN-기능명/` 폴더를 생성한다
6. `git checkout dev && git checkout -b feat/NNN-기능명` 브랜치를 생성한다
7. "FEAT-NNN 시작합니다. 1단계 아이디에이션을 진행하겠습니다." 알림 후 1단계로 진입

## 1단계: 아이디에이션

목적: 기획 의도를 구체화하고 모호한 부분을 제거한다.

- 사용자의 기능 설명을 듣고, 다음을 이해하기 위해 질문한다 (한 번에 하나씩):
  - 이 기능을 사용하는 사람은 누구인가?
  - 이 기능으로 해결하려는 문제는 무엇인가?
  - 성공했을 때 어떤 상태가 되어야 하는가?
  - 포함하지 않을 범위는 무엇인가?
- 기술적으로 불가능하거나 불필요한 부분은 정중히 제외를 제안한다
- 충분히 파악되면 `features/FEAT-NNN/01-spec.md`를 다음 형식으로 작성한다:

```markdown
# [기능명] 기획서

## 개요
[1-2문장 요약]

## 사용자
[이 기능을 사용하는 사람]

## 해결하는 문제
[현재 불편한 점 / 해결하려는 문제]

## 기대 효과
[이 기능으로 달라지는 것]

## 범위
### 포함
- [포함 항목들]

### 제외
- [제외 항목들]
```

- 작성 후 "1단계 완료입니다. 2단계 디자인으로 넘어갈까요?"라고 확인한다

## 2단계: 디자인

목적: HTML 목업으로 UI/UX를 시각적으로 확정한다. 이 파일이 UI의 SSOT다.

- `01-spec.md`를 읽고 필요한 화면을 파악한다
- `features/FEAT-NNN/02-design.html`을 작성한다:
  - Tailwind CSS CDN을 사용한 실제 동작하는 HTML 파일
  - 모든 화면 상태(기본, 로딩, 오류, 빈 상태)를 포함
  - 실제 데이터 예시를 하드코딩해 현실감 있게 작성
  - 버튼, 폼, 네비게이션 등 모든 인터랙션 요소 포함
- 작성 후 "2단계 완료입니다. 브라우저에서 `02-design.html`을 열어 확인해주세요. 수정할 부분이 있으면 말씀해주세요. 없으면 3단계로 넘어가겠습니다."라고 안내한다

## 3단계: 개발 결정사항

목적: 기술 선택을 문서화한다.

- `01-spec.md`와 `02-design.html`을 기반으로 다음을 결정하고 설명한다:
  - Next.js 라우트 구조 (어떤 페이지/API routes 필요한가)
  - Supabase 테이블 구조 (어떤 컬럼이 필요한가, tenant_id 필수)
  - 컴포넌트 분리 방식
  - 외부 라이브러리 필요 여부
- 각 결정에 대해 "왜 이렇게 결정했는가"를 함께 설명한다
- `features/FEAT-NNN/03-decisions.md`를 다음 형식으로 작성한다:

```markdown
# [기능명] 개발 결정사항

## 라우트 구조
[페이지 및 API 경로]

## 데이터베이스 스키마
[테이블명, 컬럼, 타입, RLS 정책]
※ 모든 테이블에 tenant_id UUID NOT NULL 필수

## 컴포넌트 구조
[주요 컴포넌트와 역할]

## 외부 의존성
[새로 설치할 패키지 및 이유]

## 결정 근거
[주요 선택에 대한 이유]
```

- 작성 후 "3단계 완료입니다. 4단계 태스크 분리로 넘어갈까요?"라고 확인한다

## 4단계: 태스크 분리

목적: 개발을 독립 완료 가능한 단위로 분리한다.

- `01-spec.md`와 `03-decisions.md`를 기반으로 태스크 목록을 제안한다
- 각 태스크는:
  - 2시간 내 완료 가능한 크기
  - 독립적으로 커밋 가능한 단위
  - 명확한 완료 기준이 있는 것
- 태스크 목록을 보여주고 사용자 승인을 받는다
- 승인 후 각 태스크마다 `features/FEAT-NNN/tasks/TASK-NNN-태스크명/spec.md`를 생성한다:

```markdown
# TASK-NNN: [태스크명]

## 목적
[이 태스크가 만드는 것]

## 작업 범위
- 생성할 파일: [파일 목록]
- 수정할 파일: [파일 목록]

## 완료 기준
- [ ] [확인 가능한 완료 조건 1]
- [ ] [확인 가능한 완료 조건 2]
```

- 작성 후 "4단계 완료입니다. TASK 목록: [목록]. 5단계 개발을 시작할까요?"라고 확인한다

## 5단계: 태스크별 개발

목적: 태스크를 하나씩 실제 코드로 구현한다.

- 첫 번째 태스크부터 시작한다
- 각 태스크에 대해:
  1. "TASK-NNN [태스크명] 개발을 시작합니다" 알림
  2. `spec.md`를 읽고 필요한 코드를 작성한다
  3. 코드 작성 완료 후 `features/FEAT-NNN/tasks/TASK-NNN/artifact.md`를 업데이트한다:

```markdown
# TASK-NNN: [태스크명] — 아티팩트

## 상태: 완료

## 구현 내용
[무엇을 만들었는지 2-3문장]

## 생성/수정된 파일
- `경로/파일명`: [역할 한 줄]

## 완료 기준 확인
- [x] [완료된 항목]

## 이슈 및 결정사항
[개발 중 발생한 이슈나 변경된 결정]
```

  4. `git add . && git commit -m "feat(FEAT-NNN): TASK-NNN [태스크명]"` 커밋
  5. 다음 태스크로 이동
- 모든 태스크 완료 후 "5단계 완료입니다. 6단계 테스트 케이스 생성으로 넘어갈까요?"라고 확인한다

## 6단계: 테스트 케이스 생성

목적: 사용자가 직접 수행할 수 있는 수동 테스트 케이스를 작성한다.

- `01-spec.md`의 기대 효과와 범위를 기반으로 테스트 케이스를 작성한다
- `features/FEAT-NNN/06-test-cases.md`를 생성한다:

```markdown
# [기능명] 테스트 케이스

## 테스트 전 준비사항
[필요한 사전 조건, 테스트 데이터 등]

## 정상 케이스
### TC-001: [테스트명]
**조건:** [전제 조건]
**단계:**
1. [사용자가 수행할 단계]
2. [다음 단계]
**기대 결과:** [무엇이 보여야 하는가]
**결과:** [ ] 통과 / [ ] 실패

## 예외 케이스
### TC-00N: [테스트명]
...
```

- 작성 후 "6단계 완료입니다. 위 테스트 케이스를 직접 수행해주세요. 완료 후 결과를 알려주시면 7단계로 넘어가겠습니다."라고 안내한다

## 7단계: 피드백 반영

목적: 테스트에서 발견된 문제를 수정한다.

- 사용자의 테스트 결과를 듣는다
- 모든 케이스 통과 시: "테스트 완료입니다. 8단계 배포로 넘어가겠습니다."
- 실패 케이스가 있는 경우:
  - 문제 유형에 따라 해당 단계로 복귀한다:
    - UI 문제 → 2단계로 복귀해 design.html 수정
    - 로직 문제 → 5단계로 복귀해 코드 수정
    - 기획 문제 → 1단계로 복귀해 spec.md 수정
  - 수정 후 다시 6단계 테스트를 수행한다

## 8단계: 배포

목적: 검증된 기능을 프로덕션에 배포한다.

1. `git checkout dev && git merge feat/NNN-기능명` 실행
2. `dev` 브랜치 푸시: `git push origin dev`
3. "Preview URL에서 최종 확인해주세요. 확인 후 'main 배포' 라고 말씀해주세요."라고 안내
4. 사용자 확인 후: `git checkout main && git merge dev && git push origin main`
5. "배포 완료입니다! FEAT-NNN [기능명]이 프로덕션에 반영되었습니다." 알림
6. artifact.md의 상태를 "배포 완료"로 업데이트
```

- [ ] **Step 2: 커밋**

```bash
git add .claude/commands/new-feature.md
git commit -m "feat: add /new-feature command (8-step development orchestrator)"
```

- [ ] **Step 3: 커맨드 동작 확인**

Claude Code에서 `/new-feature`를 입력해 "어떤 기능을 개발할까요?"라는 응답이 나오는지 확인한다.

---

## Task 7: /fix 커맨드 작성

**Files:**
- Create: `.claude/commands/fix.md`

- [ ] **Step 1: fix.md 커맨드 파일 작성**

Create `.claude/commands/fix.md`:
```markdown
# Fix — 버그·소소한 변경 간소화 사이클

디자인 변경 없이 버그 수정 또는 소소한 변경을 빠르게 처리하는 6단계 사이클입니다.
디자인 변경이 필요한 경우 `/new-feature`를 사용하세요.

## 시작 절차

1. `features/` 폴더에서 FIX 번호 최대값을 찾는다 (FIX-로 시작하는 폴더)
2. 다음 번호를 채번한다 (3자리 패딩)
3. 사용자에게 "어떤 문제인가요? 또는 어떤 변경이 필요한가요?"라고 묻는다
4. 설명을 영문 소문자 + 하이픈으로 변환한다
5. `features/FIX-NNN-설명/` 폴더를 생성한다
6. `git checkout dev && git checkout -b fix/NNN-설명` 브랜치를 생성한다
7. "FIX-NNN 시작합니다. 1단계 문제 정의를 진행하겠습니다." 알림 후 1단계로 진입

## 1단계: 문제 정의

- 사용자의 설명을 듣고 다음을 파악한다:
  - 어떤 상황에서 발생하는 문제인가?
  - 현재 동작과 기대 동작의 차이는?
  - 영향 범위는 어디까지인가?
- `features/FIX-NNN/01-spec.md`를 작성한다:

```markdown
# FIX-NNN: [문제/변경 설명]

## 문제 상황
[언제, 어디서 발생하는 문제인가]

## 현재 동작
[현재 어떻게 동작하는가]

## 기대 동작
[어떻게 동작해야 하는가]

## 영향 범위
[수정이 영향을 미칠 파일/기능]
```

## 2단계: 개발 결정사항 (필요 시에만)

- 수정이 단순한 경우 이 단계를 건너뛴다
- DB 구조 변경, 새 패키지 필요, 여러 컴포넌트 영향 등 복잡한 경우에만 진행
- `features/FIX-NNN/03-decisions.md`를 간략하게 작성한다

## 3단계: 태스크 분리

- 수정 작업을 태스크로 분리한다 (보통 1~2개)
- `features/FIX-NNN/tasks/TASK-001/spec.md`를 생성한다

## 4단계: 수정 개발

- 태스크 spec.md를 읽고 수정 코드를 작성한다
- `features/FIX-NNN/tasks/TASK-001/artifact.md`를 업데이트한다
- `git commit -m "fix(FIX-NNN): [수정 내용]"` 커밋한다

## 5단계: 테스트

- 수정된 기능의 영향 범위를 중심으로 테스트 케이스를 작성한다
- `features/FIX-NNN/06-test-cases.md`를 생성한다
- "테스트 케이스를 수행해주세요. 완료 후 결과를 알려주세요."라고 안내한다
- 실패 시 4단계로 복귀해 재수정한다

## 6단계: 배포

1. `git checkout dev && git merge fix/NNN-설명`
2. `git push origin dev`
3. "Preview에서 확인 후 'main 배포'라고 말씀해주세요." 안내
4. 확인 후 `git checkout main && git merge dev && git push origin main`
5. "FIX-NNN 배포 완료입니다." 알림
```

- [ ] **Step 2: 커밋**

```bash
git add .claude/commands/fix.md
git commit -m "feat: add /fix command (simplified 6-step fix cycle)"
```

---

## Task 8: /status 커맨드 작성

**Files:**
- Create: `.claude/commands/status.md`

- [ ] **Step 1: status.md 커맨드 파일 작성**

Create `.claude/commands/status.md`:
```markdown
# Status — 개발 현황 대시보드

`features/` 폴더를 스캔해 모든 기능의 현재 개발 단계를 표로 보여줍니다.

## 동작 방식

1. `features/` 폴더의 모든 하위 폴더 목록을 가져온다 (FEAT-NNN-*, FIX-NNN-* 형태)
2. 각 폴더에서 다음을 확인해 현재 단계를 판정한다:
   - `06-test-cases.md` 존재 + `tasks/` 내 모든 artifact.md가 "배포 완료" → **완료**
   - `06-test-cases.md` 존재 → **6/8 테스트 중**
   - `tasks/` 폴더 내 artifact.md 하나라도 존재 → **5/8 개발중**
   - `tasks/` 폴더 내 spec.md 하나라도 존재 → **4/8 태스크분리**
   - `03-decisions.md` 존재 → **3/8 결정완료**
   - `02-design.html` 존재 → **2/8 디자인**
   - `01-spec.md` 존재 → **1/8 아이디에이션**
   - 아무것도 없음 → **시작전**
3. 각 폴더의 마지막 수정 파일의 날짜를 가져온다
4. 결과를 표로 출력한다

## 출력 형식

```
📊 삼선 ERP 개발 현황 (2026-07-31 기준)

┌─────────────────────────┬────────────────┬──────────────────┐
│ 기능                    │ 현재 단계       │ 마지막 업데이트   │
├─────────────────────────┼────────────────┼──────────────────┤
│ FEAT-001 user-login     │ 5/8 개발중      │ 2026-07-30       │
│ FEAT-002 dashboard      │ 2/8 디자인      │ 2026-07-29       │
│ FIX-001 button-error    │ 완료            │ 2026-07-28       │
└─────────────────────────┴────────────────┴──────────────────┘

진행 중: 2개 | 완료: 1개 | 전체: 3개
```

5. 표 출력 후 "자세히 볼 기능이 있으면 알려주세요."라고 안내한다
```

- [ ] **Step 2: 커밋**

```bash
git add .claude/commands/status.md
git commit -m "feat: add /status command (development dashboard)"
```

- [ ] **Step 3: 커맨드 동작 확인**

Claude Code에서 `/status`를 입력해 현황 표가 출력되는지 확인한다.
(현재는 features/ 폴더가 비어 있으므로 "진행 중인 기능이 없습니다"가 출력되면 정상)

---

## Task 9: Vercel 배포 설정

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: vercel.json 생성**

Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

- [ ] **Step 2: GitHub 레포 연결 안내**

다음 순서로 Vercel 배포를 설정한다:
1. GitHub에 레포를 생성하고 `git remote add origin [GitHub URL]` 설정
2. `git push -u origin main` 으로 코드 푸시
3. [vercel.com](https://vercel.com)에서 "New Project" → GitHub 레포 선택
4. Environment Variables에 `.env.local.example`의 키/값 입력
5. Deploy 클릭

- [ ] **Step 3: 최종 커밋**

```bash
git add vercel.json
git commit -m "chore: add Vercel deployment configuration"
```

- [ ] **Step 4: 전체 구조 최종 확인**

PowerShell:
```powershell
Get-ChildItem -Recurse -Depth 3 | Where-Object { !$_.FullName.Contains('node_modules') -and !$_.FullName.Contains('.next') -and !$_.FullName.Contains('.git') } | Select-Object FullName
```

Expected: CLAUDE.md, .claude/commands/에 3개 커맨드, docs/harness/에 4개 문서, lib/supabase/에 3개 파일이 모두 존재

---

## 자체 검토

### 스펙 커버리지 확인

| 스펙 항목 | 구현 태스크 |
|-----------|------------|
| Git 레포 초기화 | Task 1 |
| Next.js + Supabase + Vercel | Task 2, 4, 9 |
| features/ 폴더 구조 | Task 3 |
| CLAUDE.md (링크 허브) | Task 5 |
| docs/harness/ 문서 | Task 5 |
| /new-feature 커맨드 | Task 6 |
| /fix 커맨드 | Task 7 |
| /status 커맨드 | Task 8 |
| tenant_id + RLS | Task 4 |
| dev/feat/fix 브랜치 전략 | Task 3, 6, 7 |

모든 스펙 항목이 커버됨. 플레이스홀더 없음. 타입 일관성 확인 완료.

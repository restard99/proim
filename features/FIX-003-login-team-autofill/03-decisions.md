# FIX-003 개발 결정사항

## 신규 RPC: `lookup_teams_by_name(p_tenant_id UUID, p_full_name TEXT)`
이름으로 소속팀 목록만 반환한다(중복 이름이면 여러 개). `lookup_auth_email`과 동일하게 `anon` 권한으로 호출 가능해야 로그인 전에도 쓸 수 있다. 승인 상태(status)는 반환하지 않아 미승인 계정 존재 여부가 노출되지 않도록 한다(기존 `lookup_auth_email` 설계와 동일한 보안 원칙).

```sql
CREATE OR REPLACE FUNCTION public.lookup_teams_by_name(p_tenant_id UUID, p_full_name TEXT)
RETURNS TEXT[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(team), ARRAY[]::TEXT[])
  FROM profiles
  WHERE tenant_id = p_tenant_id AND full_name = p_full_name;
$$;
REVOKE ALL ON FUNCTION public.lookup_teams_by_name(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_teams_by_name(UUID, TEXT) TO anon, authenticated;
```

## 서버 액션
`app/actions/auth.ts`에 `lookupTeamsByName(fullName: string): Promise<string[]>` 추가 — 위 RPC 호출만 감싸는 단순 래퍼.

## 프론트엔드
`LoginForm.tsx`의 이름 입력에 `onBlur` 핸들러 추가:
- 이름이 비어있으면 아무 것도 안 함
- `lookupTeamsByName` 호출 결과가 정확히 1개면 소속팀 select 값을 그 값으로 설정
- 0개 또는 2개 이상이면 그대로 둠(사용자가 직접 선택)

## 결정 근거
관리자 계정(이메일로 로그인)은 팀 조회 대상이 아니므로, 이름 필드에 `@`가 포함되어 있으면(기존 `isAdminEmailLogin` 판별 로직과 동일 기준) 자동 매칭을 시도하지 않는다.

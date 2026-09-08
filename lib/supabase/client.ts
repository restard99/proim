import { createBrowserClient } from '@supabase/ssr'
import { parse, serialize } from 'cookie'
import { toSessionCookieOptions } from './session-cookie'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // 기본 document.cookie 저장 방식을 그대로 쓰되(별도 cookies 옵션을 안 주면 라이브러리가
      // 알아서 이렇게 처리한다), setAll에서 만료값만 우리가 직접 걷어내 세션 쿠키로 만든다.
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []
          return Object.entries(parse(document.cookie)).map(([name, value]) => ({
            name,
            value: value ?? '',
          }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = serialize(name, value, toSessionCookieOptions(value, options))
          })
        },
      },
    }
  )
}

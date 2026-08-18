import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const AUTH_ROUTES = ["/login", "/signup"];
// 로그인 여부와 무관하게 항상 접근 가능한 경로. 특히 /reset-password는 이메일의
// 재설정 링크를 눌러 recovery 세션이 막 생성된 시점에 열리므로, 로그인 상태로 취급해
// "/"로 튕겨버리면 새 비밀번호를 입력할 수 없게 된다.
const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];
const PENDING_ALLOWED = ["/login", "/signup", "/pending", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = AUTH_ROUTES.includes(path);
  const isPublicRoute = PUBLIC_ROUTES.includes(path);

  if (!user) {
    if (isPublicRoute) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase.from("profiles").select("status, role").eq("id", user.id).single();

  if (!profile || profile.status !== "approved") {
    if (!PENDING_ALLOWED.includes(path)) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
    return response;
  }

  if (isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (path.startsWith("/admin") && profile.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

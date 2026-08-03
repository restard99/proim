import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const AUTH_ROUTES = ["/login", "/signup"];
const PENDING_ALLOWED = ["/login", "/signup", "/pending"];

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

  if (!user) {
    if (isAuthRoute) return response;
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

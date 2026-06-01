import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const fullUrl = request.nextUrl.toString();

  // LOG every request through middleware
  console.log(`[Middleware] ${pathname} | Full: ${fullUrl.substring(0, 120)}`);

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const publicRoutes = ["/login", "/register", "/callback", "/confirm", "/select-plan", "/verify-email", "/forgot-password", "/reset-password", "/onboarding"];
    const isPublic = publicRoutes.some((r) => pathname.startsWith(r));
    const isApi = pathname.startsWith("/api/");
    if (!isPublic && !isApi) {
      console.log(`[Middleware] No Supabase config. Redirecting ${pathname} → /login`);
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // BYPASS middleware auth for reset-password, callback, and admin
  if (pathname.startsWith("/reset-password") || pathname.startsWith("/callback") || pathname.startsWith("/admin")) {
    console.log(`[Middleware] BYPASS for ${pathname}`);
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const publicRoutes = ["/login", "/register", "/confirm", "/select-plan", "/verify-email", "/forgot-password", "/onboarding"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  const isSystemRoute =
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/test");

  if (!user && !isPublicRoute && !isSystemRoute) {
    console.log(`[Middleware] No user. Redirecting ${pathname} → /login`);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublicRoute) {
    const allowWhenAuth = ["/select-plan", "/verify-email", "/onboarding"];
    if (allowWhenAuth.some((r) => pathname.startsWith(r))) {
      return supabaseResponse;
    }
    console.log(`[Middleware] User authenticated. Redirecting ${pathname} → /`);
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

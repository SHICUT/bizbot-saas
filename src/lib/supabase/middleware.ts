import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware Supabase client.
 * Refreshes the auth session on every request (keeps JWT fresh).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, skip auth checks entirely
  // This prevents 500 errors when env vars are missing
  if (!supabaseUrl || !supabaseKey) {
    // Allow public routes, redirect everything else to login
    const publicRoutes = ["/login", "/register", "/callback", "/confirm", "/select-plan"];
    const isPublic = publicRoutes.some((r) => request.nextUrl.pathname.startsWith(r));
    const isApi = request.nextUrl.pathname.startsWith("/api/");

    if (!isPublic && !isApi) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes
  const publicRoutes = ["/login", "/register", "/callback", "/confirm", "/select-plan"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // System routes (webhooks, cron, health, test)
  const isSystemRoute =
    request.nextUrl.pathname.startsWith("/api/webhooks") ||
    request.nextUrl.pathname.startsWith("/api/cron") ||
    request.nextUrl.pathname.startsWith("/api/health") ||
    request.nextUrl.pathname.startsWith("/api/test");

  if (!user && !isPublicRoute && !isSystemRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublicRoute) {
    // Allow authenticated users to access /select-plan (post-signup flow)
    if (request.nextUrl.pathname.startsWith("/select-plan")) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware Supabase client.
 * Refreshes the auth session on every request (keeps JWT fresh).
 * This is critical — without it, sessions expire silently.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT use getSession() here — it reads from storage
  // without validating the JWT. Use getUser() which validates with Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/callback", "/confirm"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // API routes for webhooks and system endpoints are public (they use their own auth)
  const isWebhookRoute = request.nextUrl.pathname.startsWith("/api/webhooks");
  const isCronRoute = request.nextUrl.pathname.startsWith("/api/cron");
  const isHealthRoute = request.nextUrl.pathname.startsWith("/api/health");
  const isTestRoute = request.nextUrl.pathname.startsWith("/api/test");
  const isSystemRoute = isWebhookRoute || isCronRoute || isHealthRoute || isTestRoute;

  if (!user && !isPublicRoute && !isSystemRoute) {
    // Not authenticated — redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublicRoute) {
    // Already authenticated — redirect to dashboard
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

# Authentication Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│                                                                  │
│  Login Page ──→ Server Action ──→ Supabase Auth ──→ Set Cookie  │
│  Google Btn ──→ OAuth Redirect ──→ Google ──→ /callback ──→ 🏠  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PROXY (Middleware)                           │
│                                                                  │
│  Every Request → Refresh JWT → Check Auth → Allow/Redirect      │
│                                                                  │
│  Public routes: /login, /register, /callback, /confirm           │
│  Protected: everything else                                      │
│  Webhook bypass: /api/webhooks/*                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE AUTH                                │
│                                                                  │
│  JWT stored in httpOnly cookie (managed by @supabase/ssr)        │
│  Auto-refresh on every request via proxy                         │
│  RLS policies use auth.uid() from JWT                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── proxy.ts                          ← Route protection (runs on every request)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 ← Browser client (Client Components)
│   │   ├── server.ts                 ← Server client (Server Components, API routes)
│   │   ├── admin.ts                  ← Service role client (webhooks, cron)
│   │   ├── middleware.ts             ← Session refresh logic (used by proxy)
│   │   └── hooks.ts                  ← useUser() hook for client components
│   └── auth/
│       └── actions.ts                ← Server Actions (login, register, logout)
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx            ← Login form
│   │   ├── register/page.tsx         ← Registration form
│   │   ├── callback/route.ts         ← OAuth callback handler
│   │   └── confirm/page.tsx          ← Email confirmation page
│   └── api/
│       └── auth/
│           └── me/route.ts           ← Protected API endpoint example
└── components/
    └── layout/
        └── UserMenu.tsx              ← Logout dropdown
```

## Auth Flow Diagrams

### Email Login Flow
```
1. User enters email + password on /login
2. Form submits → loginWithEmail() server action
3. Server action calls supabase.auth.signInWithPassword()
4. Supabase validates credentials, returns JWT
5. @supabase/ssr sets JWT in httpOnly cookie
6. Server action calls redirect("/")
7. Proxy sees valid JWT → allows access to dashboard
```

### Google OAuth Flow
```
1. User clicks "Continue with Google"
2. loginWithGoogle() server action called
3. supabase.auth.signInWithOAuth() returns Google URL
4. User redirected to Google consent screen
5. User approves → Google redirects to /callback?code=xxx
6. /callback route.ts exchanges code for session
7. Session cookie set → redirect to dashboard
```

### Registration Flow
```
1. User fills form on /register
2. registerWithEmail() server action called
3. supabase.auth.signUp() creates user
4. Supabase sends confirmation email (if enabled)
5. User redirected to /confirm page
6. User clicks email link → /callback?code=xxx
7. Session established → redirect to dashboard
8. Database trigger auto-creates business + trial subscription
```

### Session Refresh (Proxy)
```
Every request:
1. Proxy intercepts request
2. Reads JWT from cookie
3. Calls supabase.auth.getUser() (validates with Supabase server)
4. If expired: auto-refreshes using refresh token
5. Updates cookie with new JWT
6. If no valid session + protected route → redirect to /login
```

## Security Measures

### 1. JWT Validation
- Proxy uses `getUser()` (server-validated) NOT `getSession()` (client-only)
- Every request validates the JWT with Supabase's auth server
- Expired tokens are auto-refreshed via refresh token

### 2. Cookie Security
- Cookies are httpOnly (not accessible via JavaScript)
- Cookies are Secure in production (HTTPS only)
- SameSite=Lax prevents CSRF
- Managed entirely by @supabase/ssr (no manual cookie handling)

### 3. Route Protection
- Proxy runs on EVERY request (except static assets)
- No protected page can be accessed without valid JWT
- API routes are also protected (except /api/webhooks/*)

### 4. Service Role Isolation
- `admin.ts` (service role) is NEVER imported in client code
- Only used in API routes for webhook processing
- Bypasses RLS — used only for cross-tenant operations

### 5. Row Level Security
- Even if someone bypasses the proxy, RLS prevents data access
- Database is the final security boundary
- `get_user_business_id()` function ensures tenant isolation

## Environment Variables

```env
# Required for auth to work
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co    # Public (safe for browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                # Public (safe for browser)
SUPABASE_SERVICE_ROLE_KEY=eyJ...                    # SECRET (server only)
NEXT_PUBLIC_APP_URL=http://localhost:3000            # For OAuth redirects
```

## Supabase Dashboard Setup

### 1. Enable Email Auth
- Go to Authentication → Providers → Email
- Enable "Email" provider
- Optional: Disable "Confirm email" for faster dev testing

### 2. Enable Google OAuth
- Go to Authentication → Providers → Google
- Enable Google provider
- Add Google OAuth credentials:
  - Client ID (from Google Cloud Console)
  - Client Secret
- Set redirect URL in Google Console:
  `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

### 3. Configure Redirect URLs
- Go to Authentication → URL Configuration
- Site URL: `http://localhost:3000` (dev) or your production URL
- Redirect URLs: Add `http://localhost:3000/callback`

## Testing Steps

### 1. Email Registration
```bash
# Start dev server
npm run dev

# Go to http://localhost:3000/register
# Fill in: name, business name, email, password
# Submit → should redirect to /confirm (or dashboard if email confirm disabled)
# Check Supabase dashboard → Authentication → Users (new user should appear)
# Check database → businesses table (auto-created business)
# Check database → subscriptions table (auto-created trial)
```

### 2. Email Login
```bash
# Go to http://localhost:3000/login
# Enter registered email + password
# Submit → should redirect to dashboard (/)
# Check browser cookies → should see sb-xxx-auth-token
```

### 3. Google Login
```bash
# Go to http://localhost:3000/login
# Click "Continue with Google"
# Should redirect to Google consent screen
# Approve → should redirect back to /callback → then to dashboard
```

### 4. Protected Routes
```bash
# Open incognito window
# Go to http://localhost:3000/ → should redirect to /login
# Go to http://localhost:3000/leads → should redirect to /login
# Go to http://localhost:3000/api/auth/me → should return 401
```

### 5. Logout
```bash
# While logged in, click profile → Sign out
# Should redirect to /login
# Try accessing /leads → should redirect to /login
# Check cookies → auth cookie should be cleared
```

### 6. Session Persistence
```bash
# Login successfully
# Close browser tab
# Open new tab → go to http://localhost:3000/
# Should still be logged in (cookie persists)
```

### 7. API Route Protection
```bash
# While logged in:
curl http://localhost:3000/api/auth/me
# → Returns user + business data

# While logged out:
curl http://localhost:3000/api/auth/me
# → Returns 401 Unauthorized
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Infinite redirect loop | Root page.tsx conflicts with (dashboard)/page.tsx | Remove root page.tsx |
| Google login fails | Wrong redirect URL in Google Console | Add exact Supabase callback URL |
| Session not persisting | Cookie not being set | Check NEXT_PUBLIC_APP_URL matches actual URL |
| RLS blocking queries | User not authenticated when querying | Ensure server client reads cookies correctly |
| "Invalid JWT" errors | Clock skew or expired token | Proxy auto-refreshes — check it's running |

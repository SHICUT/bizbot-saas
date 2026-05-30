"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Zap, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { loginWithEmail } from "@/lib/auth/actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  async function handleLogin(formData: FormData) {
    setError(null);
    setUnverifiedEmail(null);
    setLoading(true);

    try {
      const result = await loginWithEmail(formData);
      if (result?.error) {
        if (result.error === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(formData.get("email") as string);
        } else {
          setError(result.error);
        }
        setLoading(false);
      }
    } catch {
      // redirect throws on success
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold text-white">BizBot AI</span>
          </div>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">Never lose a lead<br />on WhatsApp again.</h1>
          <p className="text-white/70 text-lg max-w-md">AI-powered auto-replies that convert inquiries into customers while you sleep.</p>
        </div>
        <div className="relative z-10"><p className="text-white/50 text-sm">Trusted by 500+ businesses across India</p></div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
            <span className="text-lg font-bold text-text-primary">BizBot AI</span>
          </div>

          <h2 className="text-2xl font-bold text-text-primary mb-1">Welcome back</h2>
          <p className="text-sm text-text-secondary mb-8">Sign in to your account to continue</p>

          {/* Password Reset Success */}
          {resetSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700">Password updated! Please log in.</span>
            </div>
          )}

          {/* Unverified Email Warning */}
          {unverifiedEmail && (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Email not verified</p>
                  <p className="text-xs text-amber-700 mt-1">Please check your inbox and click the verification link before logging in.</p>
                </div>
              </div>
              <a
                href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                className="inline-block mt-3 text-xs text-primary font-medium hover:underline"
              >
                Resend verification email →
              </a>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          {/* Form */}
          <form action={handleLogin} className="space-y-4">
            <Input id="email" name="email" label="Email" type="email" placeholder="you@business.com" required disabled={loading} />
            <div className="relative">
              <Input id="password" name="password" label="Password" type={showPassword ? "text" : "password"} placeholder="••••••••" required disabled={loading} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[34px] text-text-muted hover:text-text-secondary" tabIndex={-1}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-sm text-primary font-medium hover:underline">Forgot password?</Link>
            </div>

            <Button className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-sm text-text-secondary text-center mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

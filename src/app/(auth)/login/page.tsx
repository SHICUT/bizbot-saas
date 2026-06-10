"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, MessageSquare, Users, Calendar, Bot, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { loginWithEmail } from "@/lib/auth/actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const code = searchParams.get("code");

  if (code && typeof window !== "undefined") {
    window.location.assign("/callback?code=" + code + "&next=/reset-password");
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

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
    <div className="min-h-screen flex">
      {/* ─── Left Panel: Marketing Hero ─── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-[#1e3a5f] via-[#1a2e4a] to-[#0f1b2d]">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1.5px 1.5px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        </div>
        {/* Gradient Orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-secondary/15 blur-[100px]" />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/brand/logo-full.png" alt="FlowNex" className="h-10 object-contain drop-shadow-lg" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-[2.75rem] font-bold text-white leading-[1.15] tracking-tight mb-5">
            Never Miss Another<br />Lead Again
          </h1>
          <p className="text-white/60 text-[17px] leading-relaxed mb-10">
            AI responds instantly, captures every inquiry, and books appointments automatically — 24/7 on WhatsApp.
          </p>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 gap-3">
            <FeatureBadge icon={MessageSquare} text="Instant AI Replies" color="blue" />
            <FeatureBadge icon={Users} text="Lead Capture" color="purple" />
            <FeatureBadge icon={Calendar} text="Auto Appointments" color="blue" />
            <FeatureBadge icon={Bot} text="Smart Follow-Ups" color="purple" />
          </div>

          {/* Product Preview Cards */}
          <div className="mt-10 relative">
            <div className="bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Live Conversation</p>
                  <p className="text-white/40 text-xs">WhatsApp • Just now</p>
                </div>
                <span className="ml-auto text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">AI Active</span>
              </div>
              <div className="space-y-2.5">
                <div className="bg-white/[0.04] rounded-lg rounded-bl-sm px-3.5 py-2.5 max-w-[80%]">
                  <p className="text-white/70 text-sm">Hi, what are your pricing plans?</p>
                </div>
                <div className="bg-primary/20 border border-primary/20 rounded-lg rounded-br-sm px-3.5 py-2.5 max-w-[85%] ml-auto">
                  <p className="text-white/90 text-sm">Hey! 👋 We have 3 plans starting at $19/mo. Would you like a quick overview or a free demo?</p>
                  <p className="text-primary/60 text-[10px] mt-1 text-right">AI • 2s response</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 flex items-center gap-6">
          <div className="flex -space-x-2">
            {["A", "B", "C", "D"].map((l, i) => (
              <div key={l} className="w-7 h-7 rounded-full bg-white/10 border-2 border-[#1e3a5f] flex items-center justify-center" style={{ zIndex: 4 - i }}>
                <span className="text-[10px] font-semibold text-white/70">{l}</span>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-sm">Growing businesses use FlowNex to automate customer conversations</p>
        </div>
      </div>

      {/* ─── Right Panel: Login Form ─── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-[380px]">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10">
            <img src="/brand/logo-full.png" alt="FlowNex" className="h-8 object-contain" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">Welcome back</h2>
            <p className="text-sm text-text-muted mt-1.5">Sign in to access your FlowNex workspace</p>
          </div>

          {/* Alerts */}
          {resetSuccess && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-sm text-emerald-700 font-medium">Password updated! Please sign in.</span>
            </div>
          )}

          {unverifiedEmail && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Email not verified</p>
                  <p className="text-xs text-amber-600 mt-1">Check your inbox and click the verification link.</p>
                </div>
              </div>
              <a href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`} className="inline-flex items-center gap-1 mt-3 text-xs text-primary font-medium hover:underline">
                Resend verification email <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Form */}
          <form action={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-text-primary block mb-1.5">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                required
                disabled={loading}
                className="w-full px-4 py-3 text-sm rounded-xl border border-border bg-gray-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-text-primary block mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-border bg-gray-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none pr-11 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-text-secondary">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-primary font-medium hover:text-primary-hover transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-text-muted text-center">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary font-semibold hover:text-primary-hover transition-colors">
                Get started free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureBadge({ icon: Icon, text, color }: { icon: typeof MessageSquare; text: string; color: "blue" | "purple" }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color === "blue" ? "bg-blue-500/15" : "bg-purple-500/15"}`}>
        <Icon className={`w-3.5 h-3.5 ${color === "blue" ? "text-blue-400" : "text-purple-400"}`} />
      </div>
      <span className="text-white/70 text-sm font-medium">{text}</span>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

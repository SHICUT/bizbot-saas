"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowRight, Lock } from "lucide-react";
import { loginWithEmail } from "@/lib/auth/actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const code = searchParams.get("code");

  if (code && typeof window !== "undefined") {
    window.location.assign("/callback?code=" + code + "&next=/reset-password");
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
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
        if (result.error === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(formData.get("email") as string);
        else setError(result.error);
        setLoading(false);
      }
    } catch { /* redirect on success */ }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════
          LEFT — Brand & Value (58%)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[58%] relative flex-col p-10 xl:p-12 2xl:p-14" style={{ background: "linear-gradient(160deg, #070B1A 0%, #0B1633 40%, #0D1A3D 70%, #060A18 100%)" }}>

        {/* Ambient glow */}
        <div className="absolute top-[10%] left-[15%] w-[350px] h-[350px] rounded-full opacity-50" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[15%] right-[10%] w-[280px] h-[280px] rounded-full opacity-40" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)" }} />

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">

          {/* Logo */}
          <img
            src="/brand/logo-full.png"
            alt="FlowNex"
            className="h-10 xl:h-11 object-contain self-start"
            style={{ filter: "drop-shadow(0 0 24px rgba(59,130,246,0.25))" }}
          />

          {/* Hero — centered vertically */}
          <div className="flex-1 flex flex-col justify-center max-w-[480px] -mt-4">
            <h1 className="text-[2.5rem] xl:text-[2.85rem] 2xl:text-[3.1rem] font-extrabold text-white leading-[1.1] tracking-[-0.02em]">
              Never Miss
              <br />
              Another{" "}
              <span className="relative inline-block">
                <span style={{ background: "linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Lead</span>
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full opacity-60" style={{ background: "linear-gradient(90deg, #3B82F6, #7C3AED)" }} />
              </span>
              {" "}Again
            </h1>

            <p className="text-[15px] xl:text-[16px] text-slate-400 leading-[1.7] mt-5 max-w-[420px]">
              AI responds instantly, captures every inquiry, and books appointments automatically — <span className="text-blue-300/80 font-medium">24/7</span> on WhatsApp.
            </p>

            {/* Feature row */}
            <div className="flex gap-2.5 mt-9">
              <Pill emoji="⚡" text="AI Replies" />
              <Pill emoji="📈" text="Lead Capture" />
              <Pill emoji="🔄" text="Follow-Ups" />
              <Pill emoji="📅" text="Bookings" />
            </div>

            {/* Mini chat demo */}
            <div className="mt-9 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/[0.05]">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-[8px]">💬</span>
                </div>
                <span className="text-[11px] text-white/50 font-medium">WhatsApp • AI responding</span>
                <span className="ml-auto text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="text-[12px] text-white/50 px-3 py-1.5 rounded-lg bg-white/[0.03] inline-block">What are your plans?</div>
                <div className="text-[12px] text-white/80 px-3 py-2 rounded-lg ml-auto max-w-[80%]" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(124,58,237,0.08))", border: "1px solid rgba(59,130,246,0.1)" }}>
                  Hey! 👋 Plans start at $19/mo. Want a quick overview?
                  <span className="block text-[9px] text-blue-300/40 mt-1 text-right">AI • 2s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom stats */}
          <div className="flex items-center gap-8">
            <MiniStat value="3s" label="Response" />
            <MiniStat value="24/7" label="Available" />
            <MiniStat value="85%" label="Captured" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT — Login Form (42%)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white">
        <div className="w-full max-w-[360px]">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <img src="/brand/logo-full.png" alt="FlowNex" className="h-8 object-contain" />
          </div>

          {/* Lock Icon */}
          <div className="hidden lg:flex w-12 h-12 rounded-2xl items-center justify-center mb-7" style={{ background: "linear-gradient(135deg, #EFF6FF, #F5F3FF)" }}>
            <Lock className="w-5 h-5 text-blue-600" />
          </div>

          <h2 className="text-[1.6rem] font-bold text-gray-900 tracking-tight">Welcome back</h2>
          <p className="text-[14px] text-gray-500 mt-1.5 mb-7">Sign in to access your FlowNex workspace</p>

          {/* Alerts */}
          {resetSuccess && <Alert type="success" text="Password updated! Please sign in." />}
          {unverifiedEmail && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" /><div><p className="text-sm font-medium text-amber-800">Email not verified</p><p className="text-xs text-amber-600 mt-0.5">Check your inbox for the link.</p></div></div>
              <a href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`} className="inline-flex items-center gap-1 mt-2.5 text-xs text-blue-600 font-medium hover:underline">Resend <ArrowRight className="w-3 h-3" /></a>
            </div>
          )}
          {error && <Alert type="error" text={error} />}

          {/* Form */}
          <form action={handleLogin} className="space-y-4">
            <Field label="Email address" id="email" type="email" placeholder="name@company.com" disabled={loading} />
            <div>
              <label htmlFor="password" className="text-[13px] font-medium text-gray-700 block mb-1.5">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" required disabled={loading} className="w-full pl-4 pr-11 py-3 text-[14px] rounded-xl border border-gray-200 bg-white focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/8 transition-all outline-none disabled:opacity-50 placeholder:text-gray-400" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-[15px] h-[15px] rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" />
                <span className="text-[13px] text-gray-600">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-[13px] text-blue-600 font-medium hover:text-blue-700">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/25 active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #3B82F6 0%, #6D28D9 100%)" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[12px] text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <p className="text-[14px] text-gray-500 text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-600 font-semibold hover:text-blue-700">Get started free</Link>
          </p>

          <div className="mt-6 flex items-center justify-center gap-3 text-[11px] text-gray-400">
            <Link href="/privacy-policy" className="hover:text-gray-600">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <span>•</span>
            <Link href="/support" className="hover:text-gray-600">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Atoms ─── */

function Pill({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-white/60" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-[10px]">{emoji}</span>{text}
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[14px] font-bold text-blue-300/70">{value}</span>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}

function Field({ label, id, type, placeholder, disabled }: { label: string; id: string; type: string; placeholder: string; disabled: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-medium text-gray-700 block mb-1.5">{label}</label>
      <input id={id} name={id} type={type} placeholder={placeholder} required disabled={disabled} className="w-full px-4 py-3 text-[14px] rounded-xl border border-gray-200 bg-white focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/8 transition-all outline-none disabled:opacity-50 placeholder:text-gray-400" />
    </div>
  );
}

function Alert({ type, text }: { type: "success" | "error"; text: string }) {
  const isSuccess = type === "success";
  return (
    <div className={`mb-5 p-3 rounded-xl flex items-center gap-2.5 ${isSuccess ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"}`}>
      {isSuccess ? <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
      <span className={`text-sm ${isSuccess ? "text-emerald-700" : "text-red-700"}`}>{text}</span>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-white flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, MessageSquare, Users, Calendar, Bot, ArrowRight, Zap, Clock } from "lucide-react";
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
        if (result.error === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(formData.get("email") as string);
        else setError(result.error);
        setLoading(false);
      }
    } catch { /* redirect on success */ }
  }

  return (
    <div className="min-h-screen flex">
      {/* ═══════════════════════════════════════════════════════════════════
          LEFT — Premium Marketing Panel (60%)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden flex-col" style={{ background: "#061B4D" }}>

        {/* ── Background Layers ── */}
        {/* Radial gradients */}
        <div className="absolute top-[-20%] right-[-5%] w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 65%)" }} />
        <div className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)" }} />
        <div className="absolute top-[35%] right-[25%] w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 60%)" }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />

        {/* Network/Workflow Lines SVG */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="flow1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(59,130,246,0.2)" />
              <stop offset="50%" stopColor="rgba(124,58,237,0.15)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0.05)" />
            </linearGradient>
            <linearGradient id="flow2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59,130,246,0.12)" />
              <stop offset="100%" stopColor="rgba(124,58,237,0.08)" />
            </linearGradient>
          </defs>
          {/* Curved workflow paths */}
          <path d="M-50,150 C100,120 200,200 350,160 S500,100 650,180 S800,220 950,150" stroke="url(#flow1)" strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M-50,350 C80,320 180,380 320,340 S480,280 600,360 S750,400 950,330" stroke="url(#flow1)" strokeWidth="1" fill="none" opacity="0.4" />
          <path d="M-50,550 C120,530 250,590 380,550 S520,490 650,570 S800,600 950,540" stroke="url(#flow1)" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M-50,720 C100,700 220,750 370,710 S530,670 680,740 S830,760 950,700" stroke="url(#flow1)" strokeWidth="1" fill="none" opacity="0.25" />
          {/* Nodes */}
          <circle cx="200" cy="160" r="3" fill="rgba(59,130,246,0.4)" />
          <circle cx="200" cy="160" r="6" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />
          <circle cx="450" cy="340" r="3" fill="rgba(124,58,237,0.4)" />
          <circle cx="450" cy="340" r="6" fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth="1" />
          <circle cx="650" cy="180" r="2.5" fill="rgba(59,130,246,0.35)" />
          <circle cx="320" cy="550" r="2.5" fill="rgba(124,58,237,0.3)" />
          <circle cx="700" cy="570" r="3" fill="rgba(59,130,246,0.3)" />
          <circle cx="700" cy="570" r="6" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
          {/* Floating particles */}
          <circle cx="100" cy="250" r="1.5" fill="rgba(147,197,253,0.4)"><animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" repeatCount="indefinite" /></circle>
          <circle cx="550" cy="120" r="1.5" fill="rgba(167,139,250,0.4)"><animate attributeName="opacity" values="0.3;0.7;0.3" dur="3.5s" repeatCount="indefinite" /></circle>
          <circle cx="750" cy="400" r="1" fill="rgba(147,197,253,0.3)"><animate attributeName="opacity" values="0.2;0.5;0.2" dur="5s" repeatCount="indefinite" /></circle>
          <circle cx="300" cy="680" r="1.5" fill="rgba(167,139,250,0.3)"><animate attributeName="opacity" values="0.1;0.5;0.1" dur="4.5s" repeatCount="indefinite" /></circle>
          <circle cx="600" cy="650" r="1" fill="rgba(147,197,253,0.25)"><animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite" /></circle>
        </svg>

        {/* ── Content ── */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">

          {/* Logo — Large & Prominent */}
          <div className="mb-auto">
            <img
              src="/brand/logo-full.png"
              alt="FlowNex"
              className="h-14 xl:h-16 object-contain"
              style={{ filter: "drop-shadow(0 0 30px rgba(59,130,246,0.4)) drop-shadow(0 0 60px rgba(124,58,237,0.2))" }}
            />
          </div>

          {/* Main Hero */}
          <div className="flex-1 flex flex-col justify-center max-w-[540px] py-8">
            {/* Headline */}
            <h1 className="text-[3rem] xl:text-[3.5rem] font-extrabold text-white leading-[1.05] tracking-tight mb-7">
              Never Miss Another{" "}
              <span style={{ background: "linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #818CF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Lead
              </span>
              {" "}Again
            </h1>

            <p className="text-[17px] text-blue-100/50 leading-[1.7] mb-12 max-w-[460px]">
              AI responds instantly, captures every inquiry, books appointments automatically, and follows up 24/7 on WhatsApp.
            </p>

            {/* Feature Cards — Glassmorphism */}
            <div className="grid grid-cols-2 gap-3.5 mb-12">
              <GlassCard icon={Zap} title="24/7 AI Assistant" />
              <GlassCard icon={Users} title="Lead Capture" />
              <GlassCard icon={Bot} title="Auto Follow-Up" />
              <GlassCard icon={Calendar} title="Appointment Booking" />
            </div>

            {/* Live Chat Demo */}
            <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)" }}>
              {/* Chat Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                    <MessageSquare className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/90 text-[13px] font-semibold">WhatsApp AI</p>
                    <p className="text-white/30 text-[10px]">Live conversation</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-400/20" style={{ background: "rgba(16,185,129,0.08)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-400">AI Active</span>
                </div>
              </div>

              {/* Messages */}
              <div className="px-5 py-4 space-y-3.5">
                {/* User */}
                <div className="flex items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-white/50">U</span>
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-md max-w-[75%]" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white/70 text-[13px]">Hi, what are your pricing plans?</p>
                  </div>
                </div>

                {/* AI */}
                <div className="flex items-end gap-2 justify-end">
                  <div className="px-4 py-3 rounded-2xl rounded-br-md max-w-[82%]" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(124,58,237,0.12) 100%)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    <p className="text-white/85 text-[13px] leading-relaxed">Hey! 👋 We have plans starting from $19/month. Would you like a quick overview or a free demo?</p>
                    <div className="flex items-center justify-end gap-1.5 mt-2">
                      <Clock className="w-3 h-3 text-blue-300/50" />
                      <span className="text-[10px] text-blue-300/50 font-medium">2s</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="mt-auto flex items-center gap-10">
            <Stat value="3s" label="Response Time" />
            <Stat value="24/7" label="Availability" />
            <Stat value="85%" label="Capture Rate" />
            <Stat value="3x" label="More Bookings" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT — Clean Login Form (40%)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white min-h-screen">
        <div className="w-full max-w-[380px]">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10">
            <img src="/brand/logo-full.png" alt="FlowNex" className="h-9 object-contain" />
          </div>

          {/* Header */}
          <div className="mb-9">
            <h2 className="text-[1.75rem] font-bold text-gray-900 tracking-tight">Welcome Back</h2>
            <p className="text-[15px] text-gray-500 mt-2">Sign in to your FlowNex workspace</p>
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
                Resend verification <ArrowRight className="w-3 h-3" />
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
              <label htmlFor="email" className="text-[13px] font-medium text-gray-700 block mb-2">Email</label>
              <input id="email" name="email" type="email" placeholder="name@company.com" required disabled={loading} className="w-full px-4 py-3.5 text-[14px] rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/8 transition-all outline-none disabled:opacity-50 placeholder:text-gray-400" />
            </div>
            <div>
              <label htmlFor="password" className="text-[13px] font-medium text-gray-700 block mb-2">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required disabled={loading} className="w-full px-4 py-3.5 text-[14px] rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/8 transition-all outline-none pr-12 disabled:opacity-50 placeholder:text-gray-400" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" />
                <span className="text-[13px] text-gray-600">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-[13px] text-blue-600 font-medium hover:text-blue-700 transition-colors">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 px-4 rounded-xl text-[15px] font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99]" style={{ background: "linear-gradient(135deg, #3B82F6 0%, #7C3AED 100%)" }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-9 pt-7 border-t border-gray-100">
            <p className="text-[14px] text-gray-500 text-center">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">Start free trial</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Components ─── */

function GlassCard({ icon: Icon, title }: { icon: typeof Zap; title: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 rounded-xl transition-all hover:scale-[1.02]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(124,58,237,0.15) 100%)", border: "1px solid rgba(59,130,246,0.1)" }}>
        <Icon className="w-4 h-4 text-blue-300" />
      </div>
      <span className="text-white/80 text-[13px] font-medium">{title}</span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-[16px] font-bold" style={{ background: "linear-gradient(135deg, #93C5FD, #C4B5FD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{value}</p>
      <p className="text-[11px] text-blue-200/30 font-medium mt-0.5">{label}</p>
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

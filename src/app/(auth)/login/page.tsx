"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, MessageSquare, Users, Calendar, Bot, ArrowRight, Zap, Clock, TrendingUp } from "lucide-react";
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
    } catch { /* redirect throws on success */ }
  }

  return (
    <div className="min-h-screen flex">
      {/* ═══════════════════════════════════════════════════════════════════════
          LEFT PANEL — Premium Marketing Hero
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[56%] relative overflow-hidden flex-col p-10 xl:p-14" style={{ background: "linear-gradient(145deg, #0a0f1e 0%, #0d1528 30%, #111d35 60%, #0c1020 100%)" }}>

        {/* ── Background Effects ── */}
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        {/* Gradient orbs */}
        <div className="absolute top-[-15%] right-[10%] w-[450px] h-[450px] rounded-full opacity-40" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-10%] left-[5%] w-[350px] h-[350px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)" }} />
        <div className="absolute top-[40%] left-[50%] w-[200px] h-[200px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)" }} />
        {/* Subtle flow lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,200 C150,180 300,250 500,200 S700,150 900,200" stroke="url(#lineGrad)" strokeWidth="1" fill="none" />
          <path d="M0,400 C200,380 350,420 550,380 S750,340 900,400" stroke="url(#lineGrad)" strokeWidth="1" fill="none" />
          <path d="M0,600 C100,580 250,640 450,600 S650,560 900,600" stroke="url(#lineGrad)" strokeWidth="1" fill="none" />
          <defs><linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#7C3AED" /></linearGradient></defs>
        </svg>

        {/* ── Logo (Large, Prominent) ── */}
        <div className="relative z-10 mb-auto">
          <img
            src="/brand/logo-full.png"
            alt="FlowNex"
            className="h-12 xl:h-14 object-contain"
            style={{ filter: "drop-shadow(0 0 20px rgba(59,130,246,0.3))" }}
          />
        </div>

        {/* ── Main Content ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-[520px]">
          {/* Headline */}
          <h1 className="text-[2.8rem] xl:text-[3.2rem] font-extrabold text-white leading-[1.08] tracking-tight mb-6">
            Never Miss{" "}
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">Another Lead</span>
            {" "}Again
          </h1>

          <p className="text-[17px] xl:text-lg text-white/55 leading-relaxed mb-12 max-w-md">
            AI responds instantly on WhatsApp, captures every inquiry, and books appointments — 24/7 while you focus on growing your business.
          </p>

          {/* ── Feature Pills ── */}
          <div className="grid grid-cols-2 gap-3 mb-12">
            <FeatureCard icon={Zap} label="24/7 AI Assistant" sublabel="Always responding" />
            <FeatureCard icon={Users} label="Lead Capture" sublabel="Every inquiry saved" />
            <FeatureCard icon={Bot} label="Auto Follow-Up" sublabel="3-step sequences" />
            <FeatureCard icon={Calendar} label="Smart Booking" sublabel="AI schedules calls" />
          </div>

          {/* ── Conversation Demo ── */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-5 xl:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white text-[13px] font-semibold">Live WhatsApp AI</p>
                  <p className="text-white/35 text-[11px]">Responding to inquiry • Now</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-400">AI Active</span>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {/* Customer */}
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[9px] font-bold text-white/60">R</span>
                </div>
                <div className="bg-white/[0.05] border border-white/[0.06] rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <p className="text-white/75 text-[13px] leading-relaxed">Hi, I saw your ad. What are your membership plans and pricing?</p>
                  <p className="text-white/25 text-[10px] mt-1.5">Rahul • 11:42 PM</p>
                </div>
              </div>

              {/* AI Reply */}
              <div className="flex gap-2.5 justify-end">
                <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/15 rounded-xl rounded-tr-sm px-4 py-3 max-w-[88%]">
                  <p className="text-white/90 text-[13px] leading-relaxed">Hey Rahul! 👋 Great timing! We have 3 plans:</p>
                  <p className="text-white/90 text-[13px] leading-relaxed mt-1">• Basic — ₹1,500/mo<br/>• Pro — ₹2,500/mo (most popular!)<br/>• Premium — ₹4,000/mo</p>
                  <p className="text-white/90 text-[13px] leading-relaxed mt-1">Want me to book a free trial session? I have slots tomorrow at 7 AM and 6 PM 💪</p>
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
                        <Zap className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="text-[10px] font-medium text-blue-300/70">FlowNex AI</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400/60" />
                      <span className="text-[10px] text-emerald-400/70 font-medium">2s response</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Stats ── */}
        <div className="relative z-10 mt-auto pt-8">
          <div className="flex items-center gap-8">
            <StatPill value="3s" label="Avg. Reply" />
            <StatPill value="24/7" label="Availability" />
            <StatPill value="85%" label="Capture Rate" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          RIGHT PANEL — Clean Login Form
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-[380px]">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10">
            <img src="/brand/logo-full.png" alt="FlowNex" className="h-9 object-contain" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[1.65rem] font-bold text-text-primary tracking-tight">Welcome back</h2>
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
              <label htmlFor="email" className="text-[13px] font-medium text-text-primary block mb-1.5">Email address</label>
              <input
                id="email" name="email" type="email" placeholder="name@company.com" required disabled={loading}
                className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/8 transition-all outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-[13px] font-medium text-text-primary block mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required disabled={loading}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/8 transition-all outline-none pr-11 disabled:opacity-50"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20" />
                <span className="text-sm text-text-secondary">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-primary font-medium hover:text-primary-hover transition-colors">Forgot?</Link>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 px-4 rounded-xl text-[14px] font-semibold text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-text-muted text-center">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary font-semibold hover:text-primary-hover transition-colors">Get started free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function FeatureCard({ icon: Icon, label, sublabel }: { icon: typeof Zap; label: string; sublabel: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.12] transition-all">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-300" />
      </div>
      <div>
        <p className="text-white/90 text-[13px] font-semibold leading-tight">{label}</p>
        <p className="text-white/35 text-[11px] mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[15px] font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">{value}</span>
      <span className="text-[11px] text-white/35 font-medium">{label}</span>
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

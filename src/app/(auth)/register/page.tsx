"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { registerWithEmail } from "@/lib/auth/actions";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await registerWithEmail(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect throws on success
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">BizBot AI</span>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Start converting leads
            <br />
            in under 5 minutes.
          </h1>
          <div className="space-y-3">
            {[
              "AI replies to customers 24/7",
              "Every lead captured automatically",
              "No technical setup required",
              "14-day free trial, no card needed",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-white/80 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/50 text-sm">
            Join 500+ Indian businesses already using BizBot
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-text-primary">
              BizBot AI
            </span>
          </div>

          <h2 className="text-2xl font-bold text-text-primary mb-1">
            Create your account
          </h2>
          <p className="text-sm text-text-secondary mb-8">
            14-day free trial • No credit card required
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form action={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="name"
                name="name"
                label="Your Name"
                placeholder="Rahul"
                required
              />
              <Input
                id="businessName"
                name="businessName"
                label="Business Name"
                placeholder="FitZone Gym"
              />
            </div>

            <Input
              id="email"
              name="email"
              label="Email"
              type="email"
              placeholder="you@business.com"
              required
            />

            <Input
              id="phone"
              name="phone"
              label="Phone Number"
              type="tel"
              placeholder="+91 98765 43210"
            />

            <div className="relative">
              <Input
                id="password"
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 6 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-text-muted hover:text-text-secondary"
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <Button className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </Button>
          </form>

          <p className="text-xs text-text-muted text-center mt-4">
            By signing up, you agree to our{" "}
            <a href="#" className="text-primary hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>

          <p className="text-sm text-text-secondary text-center mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

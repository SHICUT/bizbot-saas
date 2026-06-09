"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Eye, EyeOff, Check, Loader2, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { registerWithEmail } from "@/lib/auth/actions";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  function validate(formData: FormData): boolean {
    const errors: Record<string, string> = {};
    const name = (formData.get("name") as string || "").trim();
    const businessName = (formData.get("businessName") as string || "").trim();
    const email = (formData.get("email") as string || "").trim();
    const phone = (formData.get("phone") as string || "").trim();
    const password = (formData.get("password") as string || "");

    if (!name) errors.name = "Name is required";
    if (!businessName) errors.businessName = "Business name is required";
    if (!email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
    if (phone && !/^[\+]?[\d\s\-]{7,15}$/.test(phone)) errors.phone = "Enter a valid phone number";
    if (!password) errors.password = "Password is required";
    else if (password.length < 6) errors.password = "Password must be at least 6 characters";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleRegister(formData: FormData) {
    setError(null);
    setSuccess(false);
    setValidationErrors({});

    if (!validate(formData)) return;

    setLoading(true);

    try {
      const result = await registerWithEmail(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        // Success — show message briefly then redirect happens via server action
        setSuccess(true);
      }
    } catch {
      // redirect() throws on success — this is expected behavior
      setSuccess(true);
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
            <span className="text-xl font-bold text-white">FlowNex AI</span>
          </div>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">Start converting leads<br />in under 5 minutes.</h1>
          <div className="space-y-3">
            {["AI replies to customers 24/7", "Every lead captured automatically", "No technical setup required", "7-day free trial, no card needed"].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                <span className="text-white/80 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10"><p className="text-white/50 text-sm">Join 500+ Indian businesses already using FlowNex</p></div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
            <span className="text-lg font-bold text-text-primary">FlowNex AI</span>
          </div>

          <h2 className="text-2xl font-bold text-text-primary mb-1">Create your account</h2>
          <p className="text-sm text-text-secondary mb-8">7-day free trial • No credit card required</p>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Account created successfully!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Redirecting to plan selection...</p>
              </div>
            </div>
          )}

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
                label="Your Name *"
                placeholder="Rahul"
                required
                error={validationErrors.name}
                disabled={loading || success}
              />
              <Input
                id="businessName"
                name="businessName"
                label="Business Name *"
                placeholder="FitZone Gym"
                required
                error={validationErrors.businessName}
                disabled={loading || success}
              />
            </div>

            <Input
              id="email"
              name="email"
              label="Email *"
              type="email"
              placeholder="you@business.com"
              required
              error={validationErrors.email}
              disabled={loading || success}
            />

            <Input
              id="phone"
              name="phone"
              label="Phone Number"
              type="tel"
              placeholder="+91 98765 43210"
              error={validationErrors.phone}
              disabled={loading || success}
            />

            <div className="relative">
              <Input
                id="password"
                name="password"
                label="Password *"
                type={showPassword ? "text" : "password"}
                placeholder="Min 6 characters"
                required
                error={validationErrors.password}
                disabled={loading || success}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-text-muted hover:text-text-secondary"
                aria-label="Toggle password visibility"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button className="w-full" size="lg" disabled={loading || success}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {success && <CheckCircle className="w-4 h-4" />}
              {loading ? "Creating Account..." : success ? "Account Created!" : "Create Account"}
            </Button>
          </form>

          <p className="text-xs text-text-muted text-center mt-4">
            By signing up, you agree to our{" "}
            <a href="#" className="text-primary hover:underline">Terms</a> and{" "}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </p>

          <p className="text-sm text-text-secondary text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

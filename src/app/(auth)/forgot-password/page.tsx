"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Loader2, CheckCircle, Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { forgotPassword } from "@/lib/auth/actions";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    try {
      const result = await forgotPassword(formData);
      if (result.error) setError(result.error);
      else setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-text-primary">BizBot AI</span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Check your email</h2>
            <p className="text-sm text-text-secondary mb-6">
              We&apos;ve sent a password reset link. It expires in 10 minutes.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6">
              <div className="flex items-center gap-2 justify-center">
                <Mail className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700">Check your inbox and spam folder</span>
              </div>
            </div>
            <Link href="/login" className="text-sm text-primary font-medium hover:underline">← Back to login</Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-text-primary mb-1 text-center">Forgot password?</h2>
            <p className="text-sm text-text-secondary mb-8 text-center">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
            )}

            <form action={handleSubmit} className="space-y-4">
              <Input id="email" name="email" label="Email" type="email" placeholder="you@business.com" required disabled={loading} />
              <Button className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>

            <p className="text-sm text-text-secondary text-center mt-6">
              Remember your password?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

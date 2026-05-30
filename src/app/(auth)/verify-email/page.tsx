"use client";

import { useState, useEffect, Suspense } from "react";
import { Zap, Mail, Loader2, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { resendVerificationEmail } from "@/lib/auth/actions";
import { useSearchParams } from "next/navigation";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setResent(false);

    const formData = new FormData();
    formData.set("email", email);

    try {
      const result = await resendVerificationEmail(formData);
      if (result.error) setError(result.error);
      else { setResent(true); setCooldown(60); }
    } catch {
      setError("Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">BizBot AI</span>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">Verify your email</h1>
        <p className="text-sm text-text-secondary mb-2">
          We&apos;ve sent a verification link to:
        </p>
        <p className="text-sm font-semibold text-text-primary mb-6">{email || "your email"}</p>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-blue-800 font-medium mb-2">Next steps:</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Open your email inbox</li>
            <li>Click the &quot;Verify Email&quot; button in the email</li>
            <li>You&apos;ll be redirected back to log in</li>
          </ol>
        </div>

        {resent && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 justify-center">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-700">Verification email resent!</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <Button
          variant="secondary"
          className="w-full"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
        >
          {resending && <Loader2 className="w-4 h-4 animate-spin" />}
          {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending..." : "Resend Verification Email"}
        </Button>

        <p className="text-xs text-text-muted mt-4">
          Didn&apos;t receive it? Check your spam folder.
        </p>

        <a href="/login" className="inline-block mt-6 text-sm text-primary font-medium hover:underline">
          ← Back to login
        </a>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

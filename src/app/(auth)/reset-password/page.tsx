"use client";

import { useState } from "react";
import { Zap, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { resetPassword } from "@/lib/auth/actions";

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); setLoading(false); return; }

    try {
      const result = await resetPassword(formData);
      if (result?.error) setError(result.error);
      else setSuccess(true);
    } catch {
      // redirect throws on success
      setSuccess(true);
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

        {success ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Password updated!</h2>
            <p className="text-sm text-text-secondary mb-6">You can now log in with your new password.</p>
            <a href="/login" className="text-sm text-primary font-medium hover:underline">Go to login →</a>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-text-primary mb-1 text-center">Set new password</h2>
            <p className="text-sm text-text-secondary mb-8 text-center">Choose a strong password for your account.</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
            )}

            <form action={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input id="password" name="password" label="New Password" type={showPassword ? "text" : "password"} placeholder="Min 6 characters" required disabled={loading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[34px] text-text-muted hover:text-text-secondary" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input id="confirmPassword" name="confirmPassword" label="Confirm Password" type="password" placeholder="Re-enter password" required disabled={loading} />
              <Button className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

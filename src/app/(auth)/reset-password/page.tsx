"use client";

import { useState, useEffect } from "react";
import { Zap, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

/**
 * Reset Password Page
 *
 * Handles recovery code from Supabase email link.
 * Uses verifyOtp with type=recovery (no PKCE verifier needed).
 */
export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function handleRecovery() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const hash = window.location.hash;

      console.log("[RESET DEBUG] URL:", window.location.href);
      console.log("[RESET DEBUG] code param:", code);
      console.log("[RESET DEBUG] hash:", hash ? hash.substring(0, 80) : "(none)");

      // Method 1: code param — use verifyOtp with token_hash
      if (code) {
        console.log("[RESET DEBUG] Calling verifyOtp with token_hash:", code.substring(0, 30) + "...");
        const result = await supabase.auth.verifyOtp({
          token_hash: code,
          type: "recovery",
        });
        console.log("[RESET DEBUG] verifyOtp result:", JSON.stringify({
          hasSession: !!result.data?.session,
          user: result.data?.user?.email,
          error: result.error?.message,
          errorStatus: result.error?.status,
          errorCode: (result.error as unknown as Record<string,unknown>)?.code,
        }));

        if (!result.error && result.data?.session) {
          setReady(true);
          setChecking(false);
          return;
        }

        // verifyOtp failed — show the exact error on screen for debugging
        const errMsg = result.error?.message || "Unknown error";
        console.error("[RESET DEBUG] verifyOtp FAILED:", errMsg);
        setError(`Debug: verifyOtp failed — ${errMsg}. Code used: ${code.substring(0, 20)}...`);
        setChecking(false);
        return;
      }

      // Method 2: hash fragment with access_token
      if (hash && hash.includes("access_token")) {
        await new Promise((r) => setTimeout(r, 1000));
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
          setChecking(false);
          return;
        }
      }

      // Method 3: check if session already exists
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
        setChecking(false);
        return;
      }

      // Method 4: listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setReady(true);
          setChecking(false);
          subscription.unsubscribe();
        }
      });

      setTimeout(() => { setChecking(false); subscription.unsubscribe(); }, 5000);
    }

    handleRecovery();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); setLoading(false); return; }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Failed to update: " + updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => { window.location.assign("/login?reset=success"); }, 2000);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-text-muted">Verifying reset link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
          <span className="text-lg font-bold">BizBot AI</span>
        </div>

        {success ? (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Password updated!</h2>
            <p className="text-sm text-text-secondary">Redirecting to login...</p>
          </div>
        ) : !ready ? (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Link expired</h2>
            <p className="text-sm text-text-secondary mb-4">{error || "This reset link has expired or was already used."}</p>
            <a href="/forgot-password" className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors inline-block">Request New Link</a>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-center mb-6">Set new password</h2>
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input id="password" name="password" label="New Password" type={showPassword ? "text" : "password"} placeholder="Min 6 characters" required disabled={loading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[34px] text-text-muted" tabIndex={-1}>
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

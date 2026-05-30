"use client";

import { useState, useEffect } from "react";
import { Zap, Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

/**
 * Reset Password Page
 *
 * Supabase redirects here after user clicks the reset link in email.
 * The URL contains either:
 * - Hash fragment: #access_token=xxx&type=recovery (PKCE disabled)
 * - Query params: ?code=xxx (PKCE enabled)
 *
 * This page handles BOTH cases client-side.
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

    // Handle the recovery token from URL
    async function handleRecovery() {
      console.log("[ResetPassword] Full URL:", window.location.href);
      console.log("[ResetPassword] Search:", window.location.search);
      console.log("[ResetPassword] Hash:", window.location.hash);

      // Check URL for code param (PKCE flow)
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      console.log("[ResetPassword] Code param:", code);

      if (code) {
        console.log("[ResetPassword] Exchanging code for session...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        console.log("[ResetPassword] Exchange result:", { hasSession: !!data?.session, error: error?.message });
        if (error) {
          console.error("[ResetPassword] Exchange FAILED:", error.message, error.status);
          setError("This reset link has expired. Please request a new one.");
          setChecking(false);
          return;
        }
        console.log("[ResetPassword] Session established. User:", data.session?.user?.email);
        setReady(true);
        setChecking(false);
        return;
      }

      // Check hash fragment (non-PKCE flow)
      const hash = window.location.hash;
      if (hash && hash.includes("type=recovery")) {
        console.log("[ResetPassword] Found recovery hash, waiting for session...");
        // Supabase client auto-detects the hash and sets the session
        // Wait a moment for it to process
        await new Promise((r) => setTimeout(r, 1000));
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
          setChecking(false);
          return;
        }
      }

      // Listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        console.log("[ResetPassword] Auth event:", event);
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setReady(true);
          setChecking(false);
        }
      });

      // Check if already has a session (user might have been redirected with session intact)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
        setChecking(false);
        subscription.unsubscribe();
        return;
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        setChecking(false);
        subscription.unsubscribe();
      }, 5000);
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
      console.error("[ResetPassword] Update failed:", updateError.message);
      setError("Failed to update password: " + updateError.message);
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
          <span className="text-lg font-bold text-text-primary">BizBot AI</span>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-7 h-7 text-emerald-600" /></div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Password updated!</h2>
            <p className="text-sm text-text-secondary">Redirecting to login...</p>
          </div>
        ) : !ready ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-7 h-7 text-amber-600" /></div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Link expired</h2>
            <p className="text-sm text-text-secondary mb-6">This password reset link has expired or was already used. Please request a new one.</p>
            <a href="/forgot-password" className="inline-block px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors">Request New Link</a>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-text-primary mb-1 text-center">Set new password</h2>
            <p className="text-sm text-text-secondary mb-8 text-center">Choose a strong password.</p>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
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

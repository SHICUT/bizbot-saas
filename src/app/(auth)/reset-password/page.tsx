"use client";

import { useState, useEffect } from "react";
import { Zap, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

/**
 * Reset Password Page
 *
 * With PKCE flow, the code must be exchanged on the SERVER (via /callback route)
 * which sets the session cookie. By the time this page loads, the session
 * should already be established.
 *
 * If user arrives here with a ?code param, we exchange it server-side first.
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

    async function init() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      // If code is present, exchange it via server-side API
      if (code) {
        console.log("[ResetPassword] Code found, exchanging via server...");
        const res = await fetch("/api/auth/exchange-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        console.log("[ResetPassword] Server exchange result:", data);

        if (data.success) {
          // Reload page without code param to pick up the new session cookie
          window.location.assign("/reset-password");
          return;
        } else {
          setError(data.error || "Reset link expired. Please request a new one.");
          setChecking(false);
          return;
        }
      }

      // No code — check if we already have a session (set by previous exchange)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("[ResetPassword] Session found:", session.user?.email);
        setReady(true);
      } else {
        console.log("[ResetPassword] No session found");
        // Listen for auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
            setReady(true);
            setChecking(false);
            subscription.unsubscribe();
          }
        });
        setTimeout(() => { subscription.unsubscribe(); setChecking(false); }, 3000);
        return;
      }
      setChecking(false);
    }

    init();
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
          <span className="text-lg font-bold">FlowNex AI</span>
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

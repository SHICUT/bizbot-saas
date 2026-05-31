"use client";

import { useState, useEffect } from "react";
import { Zap, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  function log(msg: string) {
    console.log("[ResetPassword]", msg);
    setDebugLog((prev) => [...prev, msg]);
  }

  useEffect(() => {
    const supabase = createClient();

    async function handleRecovery() {
      log("Page loaded");
      log("URL: " + window.location.href);
      log("Search: " + window.location.search);
      log("Hash: " + (window.location.hash ? window.location.hash.substring(0, 50) + "..." : "(empty)"));

      // Method 1: Check for code param
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      log("Code param: " + (code ? code.substring(0, 20) + "..." : "NULL"));

      if (code) {
        log("Exchanging code for session...");
        const { data, error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchErr) {
          log("EXCHANGE FAILED: " + exchErr.message + " (status: " + exchErr.status + ")");
          setError("Reset link expired. Request a new one.");
          setChecking(false);
          return;
        }
        log("EXCHANGE OK. User: " + (data.session?.user?.email || "unknown"));
        setReady(true);
        setChecking(false);
        return;
      }

      // Method 2: Check hash fragment (non-PKCE)
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        log("Found access_token in hash. Waiting for Supabase to process...");
        await new Promise((r) => setTimeout(r, 1500));
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          log("Session from hash OK. User: " + data.session.user?.email);
          setReady(true);
          setChecking(false);
          return;
        }
        log("Session from hash FAILED");
      }

      // Method 3: Listen for auth event
      log("No code/hash. Listening for PASSWORD_RECOVERY event...");
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        log("Auth event: " + event);
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
          log("Recovery session detected via event");
          setReady(true);
          setChecking(false);
          subscription.unsubscribe();
        }
      });

      // Method 4: Check existing session
      const { data: existingSession } = await supabase.auth.getSession();
      if (existingSession.session) {
        log("Existing session found. User: " + existingSession.session.user?.email);
        setReady(true);
        setChecking(false);
        subscription.unsubscribe();
        return;
      }

      log("No session found. Waiting 5s for auth event...");
      setTimeout(() => {
        log("Timeout reached. No recovery session.");
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
      log("Password update FAILED: " + updateError.message);
      setError("Failed to update: " + updateError.message);
      setLoading(false);
      return;
    }

    log("Password updated successfully");
    setSuccess(true);
    setTimeout(() => { window.location.assign("/login?reset=success"); }, 2000);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
          <span className="text-lg font-bold">BizBot AI</span>
        </div>

        {/* DEBUG PANEL — visible on page */}
        <div className="mb-6 p-3 rounded-lg bg-gray-900 text-green-400 text-xs font-mono max-h-48 overflow-y-auto">
          <p className="text-gray-500 mb-1">Debug Log:</p>
          {debugLog.length === 0 && <p>Loading...</p>}
          {debugLog.map((line, i) => <p key={i}>{line}</p>)}
          <p className="mt-2 text-yellow-400">Ready: {String(ready)} | Checking: {String(checking)}</p>
        </div>

        {checking ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-text-muted">Verifying reset link...</p>
          </div>
        ) : success ? (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Password updated!</h2>
            <p className="text-sm text-text-secondary">Redirecting to login...</p>
          </div>
        ) : !ready ? (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Link expired or invalid</h2>
            <p className="text-sm text-text-secondary mb-4">Please request a new password reset link.</p>
            <a href="/forgot-password" className="text-primary font-medium text-sm hover:underline">Request New Link →</a>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-center mb-6">Set new password</h2>
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

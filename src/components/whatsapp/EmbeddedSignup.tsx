"use client";

import { useState } from "react";
import { Loader2, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import Button from "@/components/ui/Button";

/**
 * Meta Embedded Signup for WhatsApp
 *
 * Launches Facebook Login → WhatsApp setup flow.
 * Returns credentials automatically without manual input.
 *
 * Requirements:
 * - META_APP_ID env var set
 * - Meta App configured with Facebook Login for Business
 * - Embedded Signup enabled in the Meta App
 */

interface Props {
  onSuccess?: (data: { phone_number: string; waba_id: string }) => void;
  onError?: (error: string) => void;
}

export default function EmbeddedSignup({ onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;

  async function handleConnect() {
    if (!appId) {
      setStatus("error");
      setMessage("Meta App not configured. Use manual connection instead.");
      onError?.("Meta App ID not configured");
      return;
    }

    setLoading(true);
    setStatus("connecting");

    // Open Facebook Login popup
    const redirectUri = `${window.location.origin}/api/business/whatsapp-signup/callback`;
    const scope = "whatsapp_business_management,whatsapp_business_messaging,business_management";
    const authUrl = `https://www.facebook.com/v23.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&config_id=${process.env.NEXT_PUBLIC_META_CONFIG_ID || ""}`;

    // Open popup
    const popup = window.open(authUrl, "meta_signup", "width=600,height=700,scrollbars=yes");

    // Listen for the popup to close / return code
    const checkPopup = setInterval(async () => {
      try {
        if (popup?.closed) {
          clearInterval(checkPopup);
          // Check if connection was successful by fetching dashboard
          const res = await fetch("/api/dashboard");
          const data = await res.json();
          if (data.business?.whatsapp_connected) {
            setStatus("success");
            setMessage("WhatsApp connected successfully!");
            onSuccess?.({ phone_number: "", waba_id: "" });
          } else {
            setStatus("idle");
            setLoading(false);
          }
        }
      } catch {
        clearInterval(checkPopup);
        setStatus("error");
        setMessage("Connection failed. Please try again.");
        setLoading(false);
      }
    }, 1000);
  }

  // Fallback: If Meta App not configured, show manual flow
  if (!appId) {
    return null; // Don't render — manual connection will be shown instead
  }

  return (
    <div className="space-y-3">
      {status === "idle" && (
        <Button onClick={handleConnect} disabled={loading} className="w-full">
          <MessageSquare className="w-4 h-4" />
          Connect with Facebook
        </Button>
      )}

      {status === "connecting" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700">Connecting to Meta... Complete the setup in the popup window.</span>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700">{message}</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700">{message}</span>
        </div>
      )}
    </div>
  );
}

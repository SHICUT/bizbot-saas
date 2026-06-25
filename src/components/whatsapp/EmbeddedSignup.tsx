"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle, AlertCircle, Phone, RefreshCw, MessageSquare } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

/**
 * Meta Embedded Signup Component
 *
 * Renders the Facebook Login button that initiates the WhatsApp Business
 * Embedded Signup flow. Client clicks → Facebook Login → select WABA →
 * connect number → OTP → done. FlowNex handles everything else.
 *
 * Requirements:
 * - META_APP_ID set in env (public)
 * - META_APP_SECRET set in env (server-only)
 * - Meta App configured with Embedded Signup in Meta Developer Dashboard
 */

interface EmbeddedSignupProps {
  currentStatus: {
    connected: boolean;
    phoneNumber?: string;
    verifiedName?: string;
    connectedAt?: string;
  };
  onConnected?: () => void;
}

type Step = "idle" | "loading_sdk" | "awaiting_login" | "exchanging" | "connected" | "error";

export default function EmbeddedSignup({ currentStatus, onConnected }: EmbeddedSignupProps) {
  const [step, setStep] = useState<Step>(currentStatus.connected ? "connected" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState(currentStatus.phoneNumber || "");
  const [verifiedName, setVerifiedName] = useState(currentStatus.verifiedName || "");

  const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;

  // Load Facebook SDK
  useEffect(() => {
    if (typeof window === "undefined" || !metaAppId) return;
    if (document.getElementById("facebook-jssdk")) return;

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).FB?.init({
        appId: metaAppId,
        cookie: true,
        xfbml: true,
        version: "v23.0",
      });
    };
    document.head.appendChild(script);
  }, [metaAppId]);

  const handleEmbeddedSignup = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FB = (window as any).FB;
    if (!FB) {
      setError("Facebook SDK not loaded. Please refresh and try again.");
      return;
    }

    setStep("awaiting_login");
    setError(null);

    FB.login((response: { authResponse?: { code?: string } }) => {
      if (!response.authResponse?.code) {
        setStep("error");
        setError("Login cancelled or failed. Please try again.");
        return;
      }
      setStep("exchanging");
      exchangeCode(response.authResponse.code);
    }, {
      config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID || undefined,
      response_type: "code",
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: "",
        sessionInfoVersion: 2,
      },
    });
  }, []);

  async function exchangeCode(code: string) {
    try {
      const res = await fetch("/api/business/whatsapp-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (data.success) {
        setStep("connected");
        setPhoneNumber(data.phone_number || "");
        setVerifiedName(data.verified_name || "");
        setError(null);
        onConnected?.();
      } else {
        setStep("error");
        setError(data.error || "Connection failed. Please try again.");
      }
    } catch {
      setStep("error");
      setError("Network error. Please check your connection and try again.");
    }
  }

  async function handleDisconnect() {
    await fetch("/api/business/connect-whatsapp", { method: "DELETE" });
    setStep("idle");
    setPhoneNumber("");
    setVerifiedName("");
  }

  // Already connected state
  if (step === "connected" || currentStatus.connected) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">WhatsApp Connected</p>
              <p className="text-xs text-emerald-700">{phoneNumber || currentStatus.phoneNumber} {verifiedName || currentStatus.verifiedName ? `• ${verifiedName || currentStatus.verifiedName}` : ""}</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={handleDisconnect}>Disconnect</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="text-center py-4">
        {/* Header */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-1">Connect WhatsApp</h3>
        <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">
          Connect your WhatsApp Business number in one click. No technical setup required.
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-left max-w-sm mx-auto">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* CTA */}
        {step === "idle" && (
          <div className="space-y-3">
            {metaAppId ? (
              <Button onClick={handleEmbeddedSignup} className="w-full max-w-xs mx-auto">
                <Phone className="w-4 h-4" /> Connect with Facebook
              </Button>
            ) : (
              <p className="text-xs text-amber-600">Meta App ID not configured. Contact support.</p>
            )}
            <p className="text-xs text-text-muted">Requires a WhatsApp Business number and Facebook Business account</p>
          </div>
        )}

        {/* Loading States */}
        {step === "loading_sdk" && (
          <div className="flex items-center justify-center gap-2 text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading Facebook SDK...</span>
          </div>
        )}

        {step === "awaiting_login" && (
          <div className="flex items-center justify-center gap-2 text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Complete login in the popup window...</span>
          </div>
        )}

        {step === "exchanging" && (
          <div className="space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
            <p className="text-sm text-text-muted">Connecting your WhatsApp account...</p>
            <p className="text-xs text-text-muted">This may take a few seconds</p>
          </div>
        )}

        {step === "error" && (
          <Button variant="secondary" onClick={() => { setStep("idle"); setError(null); }}>
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
        )}
      </div>
    </Card>
  );
}
